import express from "express";
import { db } from "../services/DatabaseService.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE     = 100;

// GET /api/sessions — list sessions for the authenticated user
// Query params: ?limit=N&cursor=<created_at ISO string>
// Returns { sessions, nextCursor } when `limit` param is present;
// returns plain array otherwise (backward-compatible).
router.get("/", requireAuth, async (req, res) => {
  try {
    const usePagination = "limit" in req.query || "cursor" in req.query;

    if (usePagination) {
      const rawLimit = parseInt(req.query.limit, 10);
      const limit    = isNaN(rawLimit) || rawLimit < 1
        ? DEFAULT_PAGE_SIZE
        : Math.min(rawLimit, MAX_PAGE_SIZE);
      const cursor   = req.query.cursor || null;

      let result;
      if (req.user.role === "client") {
        result = await db.getSessionsByClientEmailPaginated(req.user.email, { limit, cursor });
      } else {
        result = await db.getSessionsByProviderPaginated(req.user.id, { limit, cursor });
      }
      return res.json(result);
    }

    // Legacy: return plain array
    let sessions;
    if (req.user.role === "client") {
      sessions = await db.getSessionsByClientEmail(req.user.email);
    } else {
      sessions = await db.getSessionsByProvider(req.user.id);
    }
    res.json(sessions);
  } catch (err) {
    console.error("[sessions] ✖ GET /:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/:id — single session detail
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const session = await db.getSessionById(req.params.id);
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

    const tasks = await db.getTasksBySessionId(req.params.id);
    res.json({ ...session, tasks });
  } catch (err) {
    console.error(`[sessions] ✖ GET /${req.params.id}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/sessions/:id — provider-only, cascade deletes tasks via FK
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "provider") {
      return res.status(403).json({ error: "Forbidden: providers only" });
    }

    const session = await db.getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });

    if (session.providerId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db.deleteSession(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(`[sessions] ✖ DELETE /${req.params.id}:`, err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
