import express from "express";
import { randomUUID } from "crypto";
import { db } from "../services/DatabaseService.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { perUserLimiter } from "../middleware/rateLimitMiddleware.js";
import { sendAllTasksCompleteEmail } from "../services/EmailService.js";
import { validateBody, createTaskSchema, updateTaskDetailsSchema, bulkCompleteSchema } from "../middleware/validateBody.js";
import logger from "../utils/logger.js";

const router = express.Router();

// GET /api/tasks?sessionId=X — list tasks for a session
router.get("/", requireAuth, perUserLimiter, async (req, res) => {
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
    logger.error({ err: err.message }, "[tasks] GET / failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/tasks — manually add a task to a session (provider-only)
router.post("/", requireAuth, validateBody(createTaskSchema), async (req, res) => {
  if (req.user.role !== "provider") {
    return res.status(403).json({ error: "Forbidden: providers only" });
  }

  const { sessionId, title, description, assignee, priority } = req.body;

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
    logger.error({ err: err.message }, "[tasks] POST / failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/tasks/bulk-complete — batch complete tasks (provider-only)
router.patch("/bulk-complete", requireAuth, validateBody(bulkCompleteSchema), async (req, res) => {
  if (req.user.role !== "provider") {
    return res.status(403).json({ error: "Forbidden: providers only" });
  }
  const { taskIds, completed } = req.body;

  try {
    const updated = await db.bulkUpdateTaskStatus(taskIds, completed, req.user.id);
    res.json(updated);
  } catch (err) {
    logger.error({ err: err.message }, "[tasks] PATCH /bulk-complete failed");
    res.status(500).json({ error: "Internal server error" });
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

    // BE-031: If the toggled task is now complete, check if ALL client tasks are done
    if (updated && updated.completed && updated.assignee === "Client") {
      const allDone = await db.areAllClientTasksComplete(task.sessionId);
      if (allDone) {
        const providerEmail = await db.getProviderEmailBySession(task.sessionId);
        if (providerEmail && session.clientEmail) {
          sendAllTasksCompleteEmail(
            providerEmail,
            session.clientEmail,
            session.title || session.filename,
          ).catch(() => {});
        }
      }
    }

    res.json(updated);
  } catch (err) {
    logger.error({ err: err.message, taskId: req.params.id }, "[tasks] PATCH toggle failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/tasks/:id/details — edit task title, description, priority (provider-only)
router.patch("/:id/details", requireAuth, validateBody(updateTaskDetailsSchema), async (req, res) => {
  if (req.user.role !== "provider") {
    return res.status(403).json({ error: "Forbidden: providers only" });
  }
  const { title, description, priority } = req.body;

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
    logger.error({ err: err.message, taskId: req.params.id }, "[tasks] PATCH details failed");
    res.status(500).json({ error: "Internal server error" });
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
    logger.error({ err: err.message, taskId: req.params.id }, "[tasks] DELETE failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
