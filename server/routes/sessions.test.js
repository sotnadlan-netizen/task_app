/**
 * QA-008 — Integration tests for GET /api/sessions
 *
 * Uses supertest against a real Express app instance (no network calls).
 * The authMiddleware and DatabaseService are mocked so we control auth
 * context and DB responses per-test.
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
  getSessionsByProvider:     vi.fn(),
  getSessionsByClientEmail:  vi.fn(),
  getSessionsByProviderPaginated:    vi.fn(),
  getSessionsByClientEmailPaginated: vi.fn(),
  getSessionById:            vi.fn(),
  deleteSession:             vi.fn(),
  getTasksBySessionId:       vi.fn(),
}));

vi.mock("../services/DatabaseService.js", () => ({ db: mockDb }));

// ── Mock rate limiter ─────────────────────────────────────────────────────────
vi.mock("../middleware/rateLimitMiddleware.js", () => ({
  apiLimiter:   (_req, _res, next) => next(),
  audioLimiter: (_req, _res, next) => next(),
}));

// ── Build test app ────────────────────────────────────────────────────────────
const { default: sessionsRouter } = await import("./sessions.js");
const app = express();
app.use(express.json());
app.use("/api/sessions", sessionsRouter);

// ── Helpers ───────────────────────────────────────────────────────────────────
function fakeSession(overrides = {}) {
  return {
    id: "sess-1", createdAt: "2026-01-01T00:00:00Z", filename: "audio.webm",
    summary: "Summary", providerId: "prov-1", clientEmail: "client@test.com",
    taskCount: 2, completedCount: 1,
    ...overrides,
  };
}

describe("GET /api/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.role = "provider";
    mockUser.id   = "prov-1";
    mockUser.email = "prov@test.com";
  });

  it("returns sessions array for a provider (legacy, no pagination params)", async () => {
    mockDb.getSessionsByProvider.mockResolvedValue([fakeSession()]);

    const res = await request(app).get("/api/sessions").set("Authorization", "Bearer tok");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].id).toBe("sess-1");
    expect(mockDb.getSessionsByProvider).toHaveBeenCalledWith("prov-1");
  });

  it("returns sessions array for a client (legacy)", async () => {
    mockUser.role  = "client";
    mockUser.email = "client@test.com";
    mockDb.getSessionsByClientEmail.mockResolvedValue([fakeSession()]);

    const res = await request(app).get("/api/sessions").set("Authorization", "Bearer tok");
    expect(res.status).toBe(200);
    expect(mockDb.getSessionsByClientEmail).toHaveBeenCalledWith("client@test.com");
  });

  it("returns paginated result when limit param is provided", async () => {
    mockDb.getSessionsByProviderPaginated.mockResolvedValue({
      sessions: [fakeSession()],
      nextCursor: null,
    });

    const res = await request(app)
      .get("/api/sessions?limit=10")
      .set("Authorization", "Bearer tok");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("sessions");
    expect(mockDb.getSessionsByProviderPaginated).toHaveBeenCalled();
  });

  it("returns 500 when DB throws", async () => {
    mockDb.getSessionsByProvider.mockRejectedValue(new Error("DB down"));
    const res = await request(app).get("/api/sessions").set("Authorization", "Bearer tok");
    expect(res.status).toBe(500);
  });
});

describe("GET /api/sessions/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.role  = "provider";
    mockUser.id    = "prov-1";
    mockUser.email = "prov@test.com";
  });

  it("returns 404 when session does not exist", async () => {
    mockDb.getSessionById.mockResolvedValue(null);
    const res = await request(app).get("/api/sessions/bad-id").set("Authorization", "Bearer tok");
    expect(res.status).toBe(404);
  });

  it("returns 403 when provider does not own the session", async () => {
    mockDb.getSessionById.mockResolvedValue(fakeSession({ providerId: "other-prov" }));
    const res = await request(app).get("/api/sessions/sess-1").set("Authorization", "Bearer tok");
    expect(res.status).toBe(403);
  });

  it("returns 403 when client requests a session that belongs to another client", async () => {
    mockUser.role  = "client";
    mockUser.email = "attacker@test.com";
    mockDb.getSessionById.mockResolvedValue(fakeSession({ clientEmail: "victim@test.com" }));
    const res = await request(app).get("/api/sessions/sess-1").set("Authorization", "Bearer tok");
    expect(res.status).toBe(403);
  });

  it("returns session + tasks when provider owns it", async () => {
    mockDb.getSessionById.mockResolvedValue(fakeSession());
    mockDb.getTasksBySessionId.mockResolvedValue([]);
    const res = await request(app).get("/api/sessions/sess-1").set("Authorization", "Bearer tok");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("sess-1");
    expect(Array.isArray(res.body.tasks)).toBe(true);
  });
});

describe("DELETE /api/sessions/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.role = "provider";
    mockUser.id   = "prov-1";
  });

  it("returns 403 for clients", async () => {
    mockUser.role = "client";
    const res = await request(app).delete("/api/sessions/sess-1").set("Authorization", "Bearer tok");
    expect(res.status).toBe(403);
  });

  it("returns 404 when session is not found", async () => {
    mockDb.getSessionById.mockResolvedValue(null);
    const res = await request(app).delete("/api/sessions/sess-1").set("Authorization", "Bearer tok");
    expect(res.status).toBe(404);
  });

  it("returns 403 when provider doesn't own the session", async () => {
    mockDb.getSessionById.mockResolvedValue(fakeSession({ providerId: "other" }));
    const res = await request(app).delete("/api/sessions/sess-1").set("Authorization", "Bearer tok");
    expect(res.status).toBe(403);
  });

  it("returns { ok: true } on successful deletion", async () => {
    mockDb.getSessionById.mockResolvedValue(fakeSession());
    mockDb.deleteSession.mockResolvedValue({ ok: true });
    const res = await request(app).delete("/api/sessions/sess-1").set("Authorization", "Bearer tok");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
