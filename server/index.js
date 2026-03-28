import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { randomUUID } from "crypto";

import { openapiSpec } from "./openapi.js";
import processRouter  from "./routes/process.js";
import tasksRouter    from "./routes/tasks.js";
import sessionsRouter from "./routes/sessions.js";
import configRouter   from "./routes/config.js";
import mockRouter     from "./routes/mock.js";
import profilesRouter from "./routes/profiles.js";
import authRouter      from "./routes/auth.js";
import analyticsRouter from "./routes/analytics.js";
import { db }         from "./services/DatabaseService.js";
import { sendReminderEmail } from "./services/EmailService.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiLimiter, audioLimiter } from "./middleware/rateLimitMiddleware.js";

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());

const corsOptions = {
  origin: [
    "https://task-app-five-woad.vercel.app",
    "http://localhost:8080",
    "http://localhost:5173",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Enable pre-flight for all routes

app.use(express.json({ limit: "1mb" }));

// ── Structured request logger (BE-036) ───────────────────────────────────────
app.use((req, res, next) => {
  const reqId = randomUUID();
  const start = Date.now();
  req.reqId = reqId;

  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(JSON.stringify({
      reqId,
      method: req.method,
      url:    req.url,
      status: res.statusCode,
      ms,
      ip:     req.ip,
      ts:     new Date().toISOString(),
    }));
  });

  next();
});

// ── In-flight audio-processing counter ───────────────────────────────────────
// Must be registered BEFORE processRouter so it runs on every request.
// Graceful shutdown (below) waits for activeAudioJobs to reach 0.
let activeAudioJobs = 0;

app.use("/api/process-audio", (req, _res, next) => {
  activeAudioJobs++;
  _res.on("finish", () => { activeAudioJobs = Math.max(0, activeAudioJobs - 1); });
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/process-audio", audioLimiter, processRouter);
app.use("/api/tasks",         apiLimiter,   tasksRouter);
app.use("/api/sessions",      apiLimiter,   sessionsRouter);
app.use("/api/config",        apiLimiter,   configRouter);
app.use("/api/mock-data",     apiLimiter,   mockRouter);
app.use("/api/profiles",      apiLimiter,   profilesRouter);
app.use("/api/auth",          apiLimiter,   authRouter);
app.use("/api/analytics",     apiLimiter,   analyticsRouter);

app.get("/",          (_req, res) => res.json({ status: "API is running successfully" }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ── API Docs (RapiDoc, no npm deps) ───────────────────────────────────────────
app.get("/api/docs/spec", (_req, res) => res.json(openapiSpec));
app.get("/api/docs", (_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html><html><head><title>Listen Agent API Docs</title>
<meta charset="utf-8">
<script type="module" src="https://cdn.jsdelivr.net/npm/rapidoc/dist/rapidoc-min.js"></script>
</head><body><rapi-doc spec-url="/api/docs/spec" theme="light" show-header="false" render-style="read" style="height:100vh;width:100%"></rapi-doc></body></html>`);
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  console.warn(`[404] ${req.method} ${req.url}`);
  res.status(404).json({ error: `Route not found: ${req.method} ${req.url}` });
});

// ── Global error handler (no stack traces in production) ─────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, async () => {
  const isProd = process.env.NODE_ENV === "production";
  console.log(`\n✅  API server running → http://localhost:${PORT} [${isProd ? "production" : "development"}]`);

  const missing = ["GOOGLE_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
    .filter((k) => !process.env[k]);
  if (missing.length) {
    console.warn(`\n⚠️  Missing env vars: ${missing.join(", ")}`);
    if (missing.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      console.warn("   → Get it from: Supabase Dashboard → Settings → API → service_role");
    }
  }

  try {
    await db.ping();
    console.log("✅  Supabase connection OK\n");
  } catch (err) {
    console.error(`\n❌  Supabase connection FAILED: ${err.message}`);
    console.error("   Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env\n");
  }

  // ── Audio expiry cleanup job (BE-023) ───────────────────────────────────────
  const EXPIRY_DAYS = parseInt(process.env.AUDIO_EXPIRY_DAYS || "30", 10);
  setTimeout(() => db.cleanupExpiredAudio(EXPIRY_DAYS), 60_000);
  setInterval(() => db.cleanupExpiredAudio(EXPIRY_DAYS), 24 * 60 * 60 * 1000);

  // ── Reminder email job (BE-030) ──────────────────────────────────────────────
  // Runs 2 minutes after startup, then every 24h.
  // Sends reminder emails for sessions with incomplete Client tasks older than 3 days.
  async function runReminderJob() {
    try {
      const pending = await db.getPendingClientTaskSessions();
      for (const { clientEmail, sessionTitle, pendingCount } of pending) {
        sendReminderEmail(clientEmail, sessionTitle, pendingCount).catch(() => {});
      }
      if (pending.length) {
        console.log(`[reminder] Sent ${pending.length} reminder email(s)`);
      }
    } catch (err) {
      console.error("[reminder] Reminder job failed:", err.message);
    }
  }
  setTimeout(runReminderJob, 2 * 60 * 1000);
  setInterval(runReminderJob, 24 * 60 * 60 * 1000);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const SHUTDOWN_TIMEOUT_MS = 30_000; // max wait for in-flight audio jobs

function shutdown(signal) {
  console.log(`\n⚡  ${signal} received — graceful shutdown in progress...`);

  // Stop accepting new connections immediately
  server.close(() => {
    console.log("✅  HTTP server closed — no new connections accepted.");
    console.log("✅  Graceful shutdown complete.");
    process.exit(0);
  });

  // Wait for active Gemini/audio-processing jobs to finish
  if (activeAudioJobs > 0) {
    console.log(`⏳  Waiting for ${activeAudioJobs} active audio job(s) to complete...`);
  }

  const poll = setInterval(() => {
    if (activeAudioJobs <= 0) {
      clearInterval(poll);
      // server.close callback will handle exit
    }
  }, 200);

  // Hard timeout — don't hang the deploy pipeline
  setTimeout(() => {
    clearInterval(poll);
    console.warn(`⚠️  Shutdown timeout (${SHUTDOWN_TIMEOUT_MS / 1000}s) reached — forcing exit.`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
