/**
 * QA-007 — Integration tests for POST /api/process-audio
 *
 * Mocks: authMiddleware, GeminiService, DatabaseService, uploadMiddleware, validateAudio
 * The test sends a real multipart form request using supertest.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUser = vi.hoisted(() => ({ id: "prov-1", email: "prov@test.com", role: "provider" }));

vi.mock("../middleware/authMiddleware.js", () => ({
  requireAuth: (req, _res, next) => {
    req.user = mockUser;
    next();
  },
}));

// Replace multer with a middleware that sets req.file and req.body
vi.mock("../middleware/uploadMiddleware.js", () => ({
  uploadAudio: {
    single: () => (req, _res, next) => {
      if (req.headers["x-test-has-file"] !== "false") {
        req.file = {
          buffer:       Buffer.from("fake-audio-data"),
          originalname: "test-recording.webm",
          mimetype:     "audio/webm",
          size:         50_000,
        };
        // Multer also parses text fields into req.body
        // Simulate by merging any JSON body that supertest sends
        Object.assign(req.body, {
          systemPrompt: req.body?.systemPrompt || undefined,
          clientEmail:  req.body?.clientEmail  || undefined,
        });
      }
      next();
    },
  },
}));

const mockAnalyze = vi.fn();
vi.mock("../services/GeminiService.js", () => ({
  analyzeAudio: mockAnalyze,
}));

const mockDb = vi.hoisted(() => ({
  getPromptConfig:         vi.fn(),
  saveSession:             vi.fn(),
  saveTasks:               vi.fn(),
  uploadAudioToStorage:    vi.fn(),
  logUsage:                vi.fn(),
}));
vi.mock("../services/DatabaseService.js", () => ({ db: mockDb }));

vi.mock("../utils/validateAudio.js", () => ({
  validateAudioBuffer: vi.fn(), // passes by default (no throw)
}));

vi.mock("../utils/deduplicateTasks.js", () => ({
  deduplicateTasks: (tasks) => tasks,
}));

vi.mock("fs/promises", () => ({
  default: { readFile: vi.fn().mockResolvedValue(Buffer.from("fake-audio-data")) },
  readFile: vi.fn().mockResolvedValue(Buffer.from("fake-audio-data")),
}));

vi.mock("fs", async () => {
  const actual = await vi.importActual("fs");
  return { ...actual, unlinkSync: vi.fn() };
});

// ── Build test app ────────────────────────────────────────────────────────────

const { default: processRouter } = await import("./process.js");
const app = express();
app.use(express.json());
app.use("/api/process-audio", processRouter);
// Error handler to surface unhandled errors in tests
app.use((err, _req, res, _next) => {
  console.error("[test error handler]", err?.message);
  res.status(500).json({ error: err?.message || "Internal error" });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function fakeGeminiResult(override = {}) {
  return {
    summary: "Session summary text",
    tasks: [
      { title: "Task 1", description: "Desc 1", assignee: "Advisor",  priority: "High" },
      { title: "Task 2", description: "Desc 2", assignee: "Client",   priority: "Medium" },
    ],
    usage: { promptTokenCount: 100, candidatesTokenCount: 50, totalTokenCount: 150 },
    ...override,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/process-audio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.getPromptConfig.mockResolvedValue({ systemPrompt: "System prompt" });
    mockDb.saveSession.mockResolvedValue({});
    mockDb.saveTasks.mockResolvedValue([]);
    mockDb.uploadAudioToStorage.mockResolvedValue(null);
    mockDb.logUsage.mockResolvedValue({});
    mockAnalyze.mockResolvedValue(fakeGeminiResult());
  });

  it("returns 400 when no audio file is attached", async () => {
    const res = await request(app)
      .post("/api/process-audio")
      .set("Authorization", "Bearer tok")
      .set("x-test-has-file", "false");

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no audio/i);
  });

  it("processes audio and returns session + tasks on success", async () => {
    const res = await request(app)
      .post("/api/process-audio")
      .set("Authorization", "Bearer tok");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("session");
    expect(res.body).toHaveProperty("tasks");
    expect(res.body.tasks).toHaveLength(2);
    expect(res.body.session.providerId).toBe("prov-1");
  });

  it("uses stored system prompt when none is provided in body", async () => {
    const res = await request(app)
      .post("/api/process-audio")
      .set("Authorization", "Bearer tok");

    expect(res.status).toBe(200);
    expect(mockDb.getPromptConfig).toHaveBeenCalledTimes(1);
    expect(mockAnalyze).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      "System prompt"
    );
  });

  it("returns 429 when Gemini quota is exceeded", async () => {
    mockAnalyze.mockRejectedValue(new Error("429 RESOURCE_EXHAUSTED quota exceeded"));

    const res = await request(app)
      .post("/api/process-audio")
      .set("Authorization", "Bearer tok");

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/quota/i);
  });

  it("returns 504 when Gemini request times out", async () => {
    mockAnalyze.mockRejectedValue(new Error("request timed out after 30000ms"));

    const res = await request(app)
      .post("/api/process-audio")
      .set("Authorization", "Bearer tok");

    expect(res.status).toBe(504);
    expect(res.body.error).toMatch(/timed out/i);
  });

  it("assigns providerId from authenticated user", async () => {
    const res = await request(app)
      .post("/api/process-audio")
      .set("Authorization", "Bearer tok");

    expect(res.status).toBe(200);
    expect(res.body.session.providerId).toBe("prov-1");
  });

  it("saves session and tasks to the database", async () => {
    await request(app)
      .post("/api/process-audio")
      .set("Authorization", "Bearer tok");

    expect(mockDb.saveSession).toHaveBeenCalledTimes(1);
    expect(mockDb.saveTasks).toHaveBeenCalledTimes(1);
    expect(mockDb.saveTasks.mock.calls[0][0]).toHaveLength(2);
  });
});

// ── Additional edge-case tests (QA-007 extended) ──────────────────────────────

describe("POST /api/process-audio — edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.getPromptConfig.mockResolvedValue({ systemPrompt: "System prompt" });
    mockDb.saveSession.mockResolvedValue({});
    mockDb.saveTasks.mockResolvedValue([]);
    mockDb.uploadAudioToStorage.mockResolvedValue(null);
    mockDb.logUsage.mockResolvedValue({});
    mockAnalyze.mockResolvedValue(fakeGeminiResult());
  });

  it("returns 401 when Google API key is invalid", async () => {
    mockAnalyze.mockRejectedValue(new Error("401 API key not valid"));
    const res = await request(app).post("/api/process-audio").set("Authorization", "Bearer tok");
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/api key/i);
  });

  it("returns 502 when the Gemini model is not found", async () => {
    mockAnalyze.mockRejectedValue(new Error("404 model not found"));
    const res = await request(app).post("/api/process-audio").set("Authorization", "Bearer tok");
    expect(res.status).toBe(502);
  });

  it("defaults unknown assignee to 'Advisor'", async () => {
    mockAnalyze.mockResolvedValue(fakeGeminiResult({
      tasks: [{ title: "T", description: "", assignee: "Manager", priority: "High" }],
    }));
    const res = await request(app).post("/api/process-audio").set("Authorization", "Bearer tok");
    expect(res.status).toBe(200);
    expect(res.body.tasks[0].assignee).toBe("Advisor");
  });

  it("defaults invalid priority to 'Medium'", async () => {
    mockAnalyze.mockResolvedValue(fakeGeminiResult({
      tasks: [{ title: "T", description: "", assignee: "Client", priority: "Critical" }],
    }));
    const res = await request(app).post("/api/process-audio").set("Authorization", "Bearer tok");
    expect(res.status).toBe(200);
    expect(res.body.tasks[0].priority).toBe("Medium");
  });
});
