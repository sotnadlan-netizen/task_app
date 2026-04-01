import express from "express";
import path from "path";
import logger from "../utils/logger.js";
import { uploadAudio } from "../middleware/uploadMiddleware.js";
import { analyzeAudio, generateEmbedding } from "../services/GeminiService.js";
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

    // Inject the advisor's custom_prompt as a behavioral preamble.
    // The custom_prompt sets tone/focus; systemPrompt enforces strict JSON schema.
    // This means the advisor controls behavior without being able to break the output format.
    if (providerId) {
      const customPrompt = await db.getCustomPrompt(providerId).catch(() => null);
      if (customPrompt) {
        systemPrompt = `${customPrompt}\n\n${systemPrompt}`;
      }
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
    const { title, summary, sentiment, followUpQuestions, tasks: rawTasks, usage, nextMeetingSuggestion } =
      await analyzeAudio(base64Audio, mimeType, systemPrompt);

    // RAG: generate embedding for this session (best-effort — never blocks save)
    const embeddingText = [
      summary || "",
      ...(rawTasks || []).map((t) => `${t.title}: ${t.description}`),
    ].join("\n").slice(0, 8000);
    const embedding = await generateEmbedding(embeddingText);

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
      embedding,             // pgvector float[] — null if embedding failed
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

    logger.info({ sessionId, taskCount: newTasks.length, hasEmbedding: !!embedding }, "[process] Session saved — audio discarded");
    res.json({ session, tasks: newTasks, nextMeetingSuggestion: nextMeetingSuggestion ?? null });

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
      logger.error({ model: process.env.GEMINI_MODEL || "gemini-2.5-flash" }, "[process] Gemini model not found — update GEMINI_MODEL in .env");
      return res.status(502).json({
        error: "AI processing is temporarily unavailable due to a configuration error. Please contact support.",
        code:  "MODEL_CONFIG_ERROR",
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
