import express from "express";
import { randomUUID } from "crypto";
import { db } from "../services/DatabaseService.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/tasks?sessionId=X — list tasks for a session
router.get("/", requireAuth, async (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ error: "sessionId query param required" });

  try {
    const session = await db.getSessionById(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    if (req.user.role === "client") {
      if (session.clientEmail !== req.user.email) {
        return res.status(403).json({ error: "Forbidden" });
      }
    } else {
      if (session.providerId !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const tasks = await db.getTasksBySessionId(sessionId);
    res.json(tasks);
  } catch (err) {
    console.error("[tasks] ✖ GET /:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks — manually add a task to a session (provider-only)
router.post("/", requireAuth, async (req, res) => {
  if (req.user.role !== "provider") {
    return res.status(403).json({ error: "Forbidden: providers only" });
  }

  const { sessionId, title, description, assignee, priority } = req.body;
  if (!sessionId || !title || !assignee || !priority) {
    return res.status(400).json({ error: "sessionId, title, assignee, and priority are required" });
  }
  if (!["Advisor", "Client"].includes(assignee)) {
    return res.status(400).json({ error: "assignee must be 'Advisor' or 'Client'" });
  }
  if (!["High", "Medium", "Low"].includes(priority)) {
    return res.status(400).json({ error: "priority must be 'High', 'Medium', or 'Low'" });
  }

  try {
    const session = await db.getSessionById(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.providerId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const task = {
      id:          randomUUID(),
      sessionId,
      createdAt:   new Date().toISOString(),
      title,
      description: description || "",
      assignee,
      priority,
      completed:   false,
    };

    const [saved] = await db.saveTasks([task]);
    res.status(201).json(saved);
  } catch (err) {
    console.error("[tasks] ✖ POST /:", err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tasks/bulk-complete — batch complete tasks (provider-only)
router.patch("/bulk-complete", requireAuth, async (req, res) => {
  if (req.user.role !== "provider") {
    return res.status(403).json({ error: "Forbidden: providers only" });
  }

  const { taskIds, completed } = req.body;
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return res.status(400).json({ error: "taskIds array is required" });
  }
  if (typeof completed !== "boolean") {
    return res.status(400).json({ error: "completed (boolean) is required" });
  }

  try {
    const updated = await db.bulkUpdateTaskStatus(taskIds, completed, req.user.id);
    res.json(updated);
  } catch (err) {
    console.error("[tasks] ✖ PATCH /bulk-complete:", err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tasks/:id — toggle task completion (assignee-scoped)
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const task = await db.getTaskById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const session = await db.getSessionById(task.sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    if (req.user.role === "client") {
      if (task.assignee !== "Client" || session.clientEmail !== req.user.email) {
        return res.status(403).json({ error: "Forbidden" });
      }
    } else {
      if (session.providerId !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const updated = await db.updateTaskStatus(req.params.id, !task.completed);
    res.json(updated);
  } catch (err) {
    console.error(`[tasks] ✖ PATCH /${req.params.id}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tasks/:id/details — edit task title, description, priority (provider-only)
router.patch("/:id/details", requireAuth, async (req, res) => {
  if (req.user.role !== "provider") {
    return res.status(403).json({ error: "Forbidden: providers only" });
  }

  const { title, description, priority } = req.body;
  if (!title && description === undefined && !priority) {
    return res.status(400).json({ error: "At least one of title, description, or priority is required" });
  }
  if (priority && !["High", "Medium", "Low"].includes(priority)) {
    return res.status(400).json({ error: "priority must be 'High', 'Medium', or 'Low'" });
  }

  try {
    const task = await db.getTaskById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const session = await db.getSessionById(task.sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.providerId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updated = await db.updateTaskDetails(req.params.id, { title, description, priority });
    res.json(updated);
  } catch (err) {
    console.error(`[tasks] ✖ PATCH /${req.params.id}/details:`, err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id — provider-only
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const task = await db.getTaskById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const session = await db.getSessionById(task.sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    if (req.user.role !== "provider" || session.providerId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const result = await db.deleteTask(req.params.id);
    res.json(result);
  } catch (err) {
    console.error(`[tasks] ✖ DELETE /${req.params.id}:`, err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
