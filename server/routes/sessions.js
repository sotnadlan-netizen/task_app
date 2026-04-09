import express from "express";
import { db } from "../services/DatabaseService.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { perUserLimiter } from "../middleware/rateLimitMiddleware.js";
import logger from "../utils/logger.js";

const router = express.Router();

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE     = 100;

// GET /api/sessions — list sessions for the authenticated user
// Query params:
//   limit=N         page size (default 20, max 100)
//   cursor=<ISO>    created_at of last item on previous page
//   search=<str>    partial case-insensitive match on client_email (provider only)
//   dateFrom=<ISO>  include only sessions on or after this date
//   dateTo=<ISO>    include only sessions on or before this date
// Returns { sessions, nextCursor } when any pagination/filter param present;
// returns plain array otherwise (backward-compatible).
router.get("/", requireAuth, perUserLimiter, async (req, res) => {
  try {
    const { limit: rawLimit, cursor, search, dateFrom, dateTo } = req.query;
    const usePagination = rawLimit != null || cursor != null || search != null
      || dateFrom != null || dateTo != null;

    // Validate date-like query params — reject anything that isn't a valid ISO 8601 date
    // to prevent malformed strings reaching the database layer.
    const ISO_RE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/;
    for (const [name, value] of [["cursor", cursor], ["dateFrom", dateFrom], ["dateTo", dateTo]]) {
      if (value != null && (!ISO_RE.test(value) || isNaN(Date.parse(value)))) {
        return res.status(400).json({ error: `Invalid '${name}' — must be a valid ISO 8601 date` });
      }
    }

    if (usePagination) {
      const parsed = parseInt(rawLimit, 10);
      const limit  = isNaN(parsed) || parsed < 1
        ? DEFAULT_PAGE_SIZE
        : Math.min(parsed, MAX_PAGE_SIZE);

      let result;
      if (req.user.role === "client") {
        result = await db.getSessionsByClientEmailPaginated(req.user.email, {
          limit,
          cursor:   cursor   || null,
          dateFrom: dateFrom || null,
          dateTo:   dateTo   || null,
        });
      } else {
        result = await db.getSessionsByProviderPaginated(req.user.id, {
          limit,
          cursor:   cursor   || null,
          search:   search   || null,
          dateFrom: dateFrom || null,
          dateTo:   dateTo   || null,
        });
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
    logger.error({ err: err.message }, "[sessions] GET / failed");
    res.status(500).json({ error: "Internal server error" });
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
    logger.error({ err: err.message, sessionId: req.params.id }, "[sessions] GET /:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/sessions/:id/audio — returns a short-lived signed URL for audio playback
router.get("/:id/audio", requireAuth, async (req, res) => {
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

    if (!session.audioUrl) {
      return res.status(404).json({ error: "No audio available for this session" });
    }

    // Derive the storage path from the public URL
    // Public URL format: .../storage/v1/object/public/<bucket>/<path>
    const bucket = process.env.SUPABASE_AUDIO_BUCKET || "audio-recordings";
    const marker = `/object/public/${bucket}/`;
    const idx = session.audioUrl.indexOf(marker);
    if (idx === -1) {
      return res.status(500).json({ error: "Cannot derive storage path from audio URL" });
    }
    const storagePath = session.audioUrl.slice(idx + marker.length);
    const signedUrl = await db.getAudioSignedUrl(storagePath);

    if (!signedUrl) {
      return res.status(500).json({ error: "Failed to generate signed URL" });
    }

    res.json({ signedUrl, expiresIn: 3600 });
  } catch (err) {
    logger.error({ err: err.message, sessionId: req.params.id }, "[sessions] GET /:id/audio failed");
    res.status(500).json({ error: "Internal server error" });
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
    logger.error({ err: err.message, sessionId: req.params.id }, "[sessions] DELETE /:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
