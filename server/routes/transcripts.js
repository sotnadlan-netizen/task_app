import { randomUUID } from "crypto";
import express from "express";
import { z } from "zod";
import logger from "../utils/logger.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validateBody } from "../middleware/validateBody.js";
import { analyzeText } from "../services/GeminiService.js";
import { db } from "../services/DatabaseService.js";
import { deduplicateTasks } from "../utils/deduplicateTasks.js";

const router = express.Router();

// ── Schemas ───────────────────────────────────────────────────────────────────

const processTranscriptSchema = z.object({
  transcript:   z.string().min(20, "transcript must be at least 20 characters").max(50_000),
  clientEmail:  z.string().email("clientEmail must be a valid email").optional().or(z.literal("")),
  systemPrompt: z.string().min(10).max(20_000).optional(),
});

// ── POST /api/transcripts ─────────────────────────────────────────────────────
// Accept a plain-text transcript, run Gemini analysis, persist session + tasks.

router.post(
  "/",
  requireAuth,
  validateBody(processTranscriptSchema),
  async (req, res, next) => {
    const { transcript, clientEmail, systemPrompt: bodyPrompt } = req.body;
    const providerId = req.user?.id;

    try {
      let systemPrompt = bodyPrompt;
      if (!systemPrompt) {
        const config = await db.getPromptConfig();
        systemPrompt = config.systemPrompt;
      }

      logger.info(
        { providerId, transcriptLen: transcript.length, clientEmail: clientEmail || "(none)" },
        "[transcripts] Processing text transcript"
      );

      const { title, summary, sentiment, followUpQuestions, tasks: rawTasks, usage } =
        await analyzeText(transcript, systemPrompt);

      const sessionId = randomUUID();

      const session = {
        id:                sessionId,
        createdAt:         new Date().toISOString(),
        filename:          "transcript.txt",
        title:             title    || "",
        summary:           summary  || "",
        sentiment:         sentiment || "Neutral",
        followUpQuestions: followUpQuestions || [],
        providerId:        providerId  || null,
        clientEmail:       clientEmail || null,
        audioUrl:          null,
      };

      await db.saveSession(session);

      const uniqueRawTasks = deduplicateTasks(rawTasks || []);

      const newTasks = uniqueRawTasks.map((t) => ({
        id:          randomUUID(),
        sessionId,
        title:       t.title       || "Untitled",
        description: t.description || "",
        assignee:    t.assignee === "Client" ? "Client" : "Advisor",
        priority:    ["High", "Medium", "Low"].includes(t.priority) ? t.priority : "Medium",
        completed:   false,
        createdAt:   new Date().toISOString(),
      }));

      await db.saveTasks(newTasks);

      if (usage) {
        const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
        db.logUsage({
          model:        MODEL,
          sessionId,
          promptTokens: usage.promptTokenCount     || 0,
          outputTokens: usage.candidatesTokenCount  || 0,
          totalTokens:  usage.totalTokenCount       || 0,
        }).catch(() => {});
      }

      logger.info({ sessionId, taskCount: newTasks.length }, "[transcripts] Session saved");
      res.status(201).json({ session, tasks: newTasks });

    } catch (err) {
      logger.error({ err: { message: err.message, stack: err.stack } }, "[transcripts] Processing error");

      const msg = err.message || "";

      if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
        return res.status(429).json({ error: "AI quota exceeded — check billing or try a different model.", code: "QUOTA_EXCEEDED" });
      }
      if (msg.includes("401") || msg.includes("API key") || msg.includes("API_KEY")) {
        return res.status(401).json({ error: "Invalid or missing Google API key.", code: "INVALID_API_KEY" });
      }
      if (msg.includes("timed out")) {
        return res.status(504).json({ error: "AI request timed out. Please try again.", code: "TIMEOUT" });
      }

      next(err);
    }
  }
);

// ── GET /api/transcripts/:sessionId ──────────────────────────────────────────
// Return the session and its tasks for a given sessionId.

router.get("/:sessionId", requireAuth, async (req, res, next) => {
  const { sessionId } = req.params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
    return res.status(400).json({ error: "Invalid sessionId format.", code: "INVALID_SESSION_ID" });
  }

  try {
    const [session, tasks] = await Promise.all([
      db.getSessionById(sessionId),
      db.getTasksBySessionId(sessionId),
    ]);

    if (!session) {
      return res.status(404).json({ error: "Session not found.", code: "SESSION_NOT_FOUND" });
    }

    // Tenant isolation: only the owning provider may read this session
    if (session.providerId && session.providerId !== req.user?.id) {
      return res.status(403).json({ error: "Access denied.", code: "FORBIDDEN" });
    }

    res.json({ session, tasks });

  } catch (err) {
    logger.error({ err: err.message, sessionId }, "[transcripts] getById error");
    next(err);
  }
});

export default router;
