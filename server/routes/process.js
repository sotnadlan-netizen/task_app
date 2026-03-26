import express from "express";
import path from "path";
import fs from "fs/promises";
import { unlinkSync } from "fs";
import { uploadAudio } from "../middleware/uploadMiddleware.js";
import { analyzeAudio } from "../services/GeminiService.js";
import { db } from "../services/DatabaseService.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validateAudioBuffer } from "../utils/validateAudio.js";
import { deduplicateTasks } from "../utils/deduplicateTasks.js";

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

router.post("/", requireAuth, uploadAudio.single("audio"), async (req, res, next) => {
  const audioFile = req.file;
  try {
    if (!audioFile) {
      return res.status(400).json({ error: "No audio file provided." });
    }

    // Resolve system prompt: prefer value sent from UI, fall back to stored config
    let { systemPrompt, clientEmail } = req.body;
    if (!systemPrompt) {
      const config = await db.getPromptConfig();
      systemPrompt = config.systemPrompt;
    }

    console.log(
      `[process] ▶ File: ${audioFile.originalname} ` +
      `(${(audioFile.size / 1024).toFixed(1)} KB), ` +
      `mime: ${audioFile.mimetype}`
    );

    const audioBuffer = await fs.readFile(audioFile.path);

    // AI-014: Reject recordings that are too short (~< 3 seconds)
    try {
      validateAudioBuffer(audioBuffer);
    } catch (validationErr) {
      return res.status(422).json({ error: validationErr.message });
    }

    const base64Audio = audioBuffer.toString("base64");
    const mimeType = resolveMimeType(audioFile.originalname, audioFile.mimetype);

    const { summary, tasks: rawTasks, usage } = await analyzeAudio(base64Audio, mimeType, systemPrompt);

    const session = {
      id:          crypto.randomUUID(),
      createdAt:   new Date().toISOString(),
      filename:    audioFile.originalname,
      summary:     summary || "",
      providerId:  req.user.id,
      clientEmail: clientEmail || null,
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

    console.log(`[process] ✔ Session saved — ${newTasks.length} tasks extracted. Audio deleted.`);
    res.json({ session, tasks: newTasks });

  } catch (err) {
    const msg = err.message || "";

    if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
      console.error("[process] ✖ QUOTA EXCEEDED:", msg.slice(0, 300));
      return res.status(429).json({
        error: "AI quota exceeded — check billing or try a different model.",
        detail: msg.slice(0, 300),
      });
    }
    if (msg.includes("401") || msg.includes("API key") || msg.includes("API_KEY")) {
      console.error("[process] ✖ AUTH ERROR:", msg.slice(0, 200));
      return res.status(401).json({ error: "Invalid or missing Google API key." });
    }
    if (msg.includes("404") || msg.includes("not found")) {
      const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      console.error("[process] ✖ MODEL NOT FOUND:", msg.slice(0, 200));
      return res.status(502).json({
        error: `Gemini model "${MODEL}" not found. Set GEMINI_MODEL in .env to a valid model name.`,
      });
    }
    if (msg.includes("timed out")) {
      console.error("[process] ✖ TIMEOUT:", msg.slice(0, 200));
      return res.status(504).json({ error: "AI request timed out. Please try again." });
    }

    next(err);

  } finally {
    if (audioFile?.path) {
      try { unlinkSync(audioFile.path); } catch (_) {}
    }
  }
});

export default router;
