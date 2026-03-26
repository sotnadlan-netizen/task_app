import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import processRouter  from "./routes/process.js";
import tasksRouter    from "./routes/tasks.js";
import sessionsRouter from "./routes/sessions.js";
import configRouter   from "./routes/config.js";
import mockRouter     from "./routes/mock.js";
import profilesRouter from "./routes/profiles.js";
import { db }         from "./services/DatabaseService.js";
import { errorHandler } from "./middleware/errorHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Uploads folder (multer needs it to exist) ─────────────────────────────────
const UPLOADS = path.join(__dirname, "../uploads");
fs.mkdirSync(UPLOADS, { recursive: true });

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

// ── Request logger ────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/process-audio", processRouter);
app.use("/api/tasks",         tasksRouter);
app.use("/api/sessions",      sessionsRouter);
app.use("/api/config",        configRouter);
app.use("/api/mock-data",     mockRouter);
app.use("/api/profiles",     profilesRouter);

app.get("/",          (_req, res) => res.json({ status: "API is running successfully" }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  console.warn(`[404] ${req.method} ${req.url}`);
  res.status(404).json({ error: `Route not found: ${req.method} ${req.url}` });
});

// ── Global error handler (no stack traces in production) ─────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
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
});
