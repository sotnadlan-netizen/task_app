/**
 * BE-024, BE-025, BE-026 — Integration tests for config routes
 *
 * GET /api/config         — fetch active system prompt (any auth role)
 * PUT /api/config         — update system prompt (provider-only)
 * GET /api/config/history — return last 20 prompt snapshots (provider-only)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// ── Mock authMiddleware ───────────────────────────────────────────────────────
const mockUser = vi.hoisted(() => ({ id: "prov-1", email: "prov@test.com", role: "provider" }));

vi.mock("../middleware/authMiddleware.js", () => ({
  requireAuth: (req, _res, next) => {
    req.user = mockUser;
    next();
  },
}));

// ── Mock DatabaseService ──────────────────────────────────────────────────────
const mockDb = vi.hoisted(() => ({
  getPromptConfig:    vi.fn(),
  savePromptConfig:   vi.fn(),
  logPromptHistory:   vi.fn(),
  getPromptHistory:   vi.fn(),
}));

vi.mock("../services/DatabaseService.js", () => ({ db: mockDb }));

// ── Build test app ────────────────────────────────────────────────────────────
const { default: configRouter } = await import("./config.js");
const app = express();
app.use(express.json());
app.use("/api/config", configRouter);

// ── Helpers ───────────────────────────────────────────────────────────────────
const FAKE_PROMPT = { systemPrompt: "You are a mortgage advisor AI." };

// ── GET /api/config ───────────────────────────────────────────────────────────
describe("GET /api/config (BE-024)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.role = "provider";
  });

  it("returns the active system prompt for any authenticated user", async () => {
    mockDb.getPromptConfig.mockResolvedValue(FAKE_PROMPT);
    const res = await request(app).get("/api/config").set("Authorization", "Bearer tok");
    expect(res.status).toBe(200);
    expect(res.body.systemPrompt).toBe(FAKE_PROMPT.systemPrompt);
  });

  it("also returns config for client role (no role restriction on GET)", async () => {
    mockUser.role = "client";
    mockDb.getPromptConfig.mockResolvedValue(FAKE_PROMPT);
    const res = await request(app).get("/api/config").set("Authorization", "Bearer tok");
    expect(res.status).toBe(200);
    expect(res.body.systemPrompt).toBeDefined();
  });

  it("returns 500 when DB throws", async () => {
    mockDb.getPromptConfig.mockRejectedValue(new Error("DB fail"));
    const res = await request(app).get("/api/config").set("Authorization", "Bearer tok");
    expect(res.status).toBe(500);
  });
});

// ── PUT /api/config ───────────────────────────────────────────────────────────
describe("PUT /api/config (BE-025)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.role = "provider";
    mockUser.id   = "prov-1";
  });

  it("returns 403 for client role", async () => {
    mockUser.role = "client";
    const res = await request(app)
      .put("/api/config")
      .set("Authorization", "Bearer tok")
      .send({ systemPrompt: "new prompt" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/providers only/i);
  });

  it("archives current prompt and saves new one (provider)", async () => {
    mockDb.getPromptConfig.mockResolvedValue(FAKE_PROMPT);
    mockDb.logPromptHistory.mockResolvedValue(undefined);
    mockDb.savePromptConfig.mockResolvedValue({ systemPrompt: "new prompt" });

    const res = await request(app)
      .put("/api/config")
      .set("Authorization", "Bearer tok")
      .send({ systemPrompt: "new prompt" });

    expect(res.status).toBe(200);
    expect(res.body.systemPrompt).toBe("new prompt");
    // Archiving: logPromptHistory called with old prompt + provider id
    expect(mockDb.logPromptHistory).toHaveBeenCalledWith(FAKE_PROMPT.systemPrompt, "prov-1");
    // Saving: savePromptConfig called with new body
    expect(mockDb.savePromptConfig).toHaveBeenCalledWith({ systemPrompt: "new prompt" });
  });

  it("returns 500 when DB save throws", async () => {
    mockDb.getPromptConfig.mockResolvedValue(FAKE_PROMPT);
    mockDb.logPromptHistory.mockResolvedValue(undefined);
    mockDb.savePromptConfig.mockRejectedValue(new Error("save failed"));

    const res = await request(app)
      .put("/api/config")
      .set("Authorization", "Bearer tok")
      .send({ systemPrompt: "new prompt" });

    expect(res.status).toBe(500);
  });
});

// ── GET /api/config/history ───────────────────────────────────────────────────
describe("GET /api/config/history (BE-026 archiving)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.role = "provider";
  });

  it("returns 403 for client role", async () => {
    mockUser.role = "client";
    const res = await request(app).get("/api/config/history").set("Authorization", "Bearer tok");
    expect(res.status).toBe(403);
  });

  it("returns prompt history array for provider", async () => {
    const history = [
      { systemPrompt: "old prompt 1", createdAt: "2026-01-01T00:00:00Z" },
      { systemPrompt: "old prompt 2", createdAt: "2026-02-01T00:00:00Z" },
    ];
    mockDb.getPromptHistory.mockResolvedValue(history);

    const res = await request(app).get("/api/config/history").set("Authorization", "Bearer tok");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(mockDb.getPromptHistory).toHaveBeenCalledWith(20);
  });

  it("returns 500 when DB throws", async () => {
    mockDb.getPromptHistory.mockRejectedValue(new Error("fail"));
    const res = await request(app).get("/api/config/history").set("Authorization", "Bearer tok");
    expect(res.status).toBe(500);
  });
});
