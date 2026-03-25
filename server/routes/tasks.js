import express from "express";
import { db } from "../services/DatabaseService.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

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
