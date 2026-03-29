import express from "express";
import path from "path";
import logger from "../utils/logger.js";
import { uploadAudio } from "../middleware/uploadMiddleware.js";
import { analyzeAudio } from "../services/GeminiService.js";
import { db } from "../services/DatabaseService.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validateBody, processAudioSchema } from "../middleware/validateBody.js";
import { validateAudioBuffer } from "../utils/validateAudio.js";
import { deduplicateTasks } from "../utils/deduplicateTasks.js";
import { sendNewSessionEmail } from "../services/EmailService.js";

const router = express.Router();

function resolveMimeType(originalname, mimetype) {
  // Strip codec suffix: "audio/webm;codecs=opus" → "audio/webm"
  const clean = mimetype ? mimetype.split(";")[0].trim() : "";
  if (clean.startsWith("audio/")) return clean;
  const ext = path.extname(originalname).toLowerCase();
  const map = {
    ".mp3": "audio/mp3",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".webm": "audio/webm",
  };
  return map[ext] || "audio/webm";
}

router.post("/", requireAuth, uploadAudio.single("audio"), validateBody(processAudioSchema), async (req, res, next) => {
  const audioFile = req.file;
  try {
    if (!audioFile) {
      return res.status(400).json({ error: "No audio file provided." });
    }

    // Dual-role payload check
    const providerId = req.user?.id;
    if (!providerId) {
      logger.warn("[process] Missing provider_id — auth middleware did not populate req.user");
    }

    let { systemPrompt, clientEmail } = req.body;
    if (!clientEmail) {
      logger.warn("[process] client_email not provided — session will not be assigned to a client");
    }

    if (!systemPrompt) {
      const config = await db.getPromptConfig();
      systemPrompt = config.systemPrompt;
    }

    logger.info({
      filename: audioFile.originalname,
      sizeKb:   (audioFile.size / 1024).toFixed(1),
      mime:     audioFile.mimetype,
    }, "[process] Audio received");

    // Memory storage — buffer is already in req.file.buffer, no disk read needed
    const audioBuffer = audioFile.buffer;

    // AI-014: Reject recordings that are too short (~< 3 seconds)
    try {
      validateAudioBuffer(audioBuffer);
    } catch (validationErr) {
      return res.status(422).json({ error: validationErr.message });
    }

    const base64Audio = audioBuffer.toString("base64");
    const mimeType = resolveMimeType(audioFile.originalname, audioFile.mimetype);

    const sessionId = crypto.randomUUID();

    // Privacy-first: audio is NOT stored — process directly and discard
    const { title, summary, sentiment, followUpQuestions, tasks: rawTasks, usage } =
      await analyzeAudio(base64Audio, mimeType, systemPrompt);

    const session = {
      id:                sessionId,
      createdAt:         new Date().toISOString(),
      filename:          audioFile.originalname,
      title:             title || "",
      summary:           summary || "",
      sentiment:         sentiment || "Neutral",
      followUpQuestions: followUpQuestions || [],
      providerId:        providerId || null,
      clientEmail:       clientEmail || null,
      audioUrl:          null, // audio is never persisted
    };
    await db.saveSession(session);

    // AI-016: Deduplicate tasks with the same title before persisting
    const uniqueRawTasks = deduplicateTasks(rawTasks || []);

    const newTasks = uniqueRawTasks.map((t) => ({
      id:          crypto.randomUUID(),
      sessionId:   session.id,
      title:       t.title       || "Untitled",
      description: t.description || "",
      assignee:    t.assignee === "Client" ? "Client" : "Advisor",
      priority:    ["High", "Medium", "Low"].includes(t.priority) ? t.priority : "Medium",
      completed:   false,
      createdAt:   new Date().toISOString(),
    }));

    await db.saveTasks(newTasks);

    // BE-029: Notify client of new session (fire-and-forget)
    if (clientEmail) {
      sendNewSessionEmail(clientEmail, session.title || session.filename, newTasks.length).catch(() => {});
    }

    // AI-015: Log token usage (fire-and-forget — never blocks the response)
    if (usage) {
      const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      db.logUsage({
        model:        MODEL,
        sessionId:    session.id,
        promptTokens: usage.promptTokenCount    || 0,
        outputTokens: usage.candidatesTokenCount || 0,
        totalTokens:  usage.totalTokenCount     || 0,
      }).catch(() => {});
    }

    logger.info({ sessionId, taskCount: newTasks.length }, "[process] Session saved — audio discarded");
    res.json({ session, tasks: newTasks });

  } catch (err) {
    // Full error visibility for debugging
    logger.error({ err: { message: err.message, stack: err.stack } }, "[process] Audio processing error");

    const msg = err.message || "";

    if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
      return res.status(429).json({
        error: "AI quota exceeded — check billing or try a different model.",
        detail: msg.slice(0, 300),
      });
    }
    if (msg.includes("401") || msg.includes("API key") || msg.includes("API_KEY")) {
      return res.status(401).json({ error: "Invalid or missing Google API key." });
    }
    if (msg.includes("404") || msg.includes("not found")) {
      const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      return res.status(502).json({
        error: `Gemini model "${MODEL}" not found. Set GEMINI_MODEL in .env to a valid model name.`,
      });
    }
    if (msg.includes("timed out")) {
      return res.status(504).json({ error: "AI request timed out. Please try again." });
    }

    // Generic 500 — include message and stack for debugging
    return res.status(500).json({
      error: err.message || "Internal error",
      stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
    });
  }
  // No finally/unlink needed — memoryStorage leaves no temp files on disk
});

export default router;
