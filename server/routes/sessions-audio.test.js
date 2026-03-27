/**
 * BE-022 — Integration tests for GET /api/sessions/:id/audio
 *
 * Verifies signed-URL generation, authorization checks, and error paths.
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
  getSessionById:      vi.fn(),
  getTasksBySessionId: vi.fn(),
  deleteSession:       vi.fn(),
  getSessionsByProvider:             vi.fn(),
  getSessionsByClientEmail:          vi.fn(),
  getSessionsByProviderPaginated:    vi.fn(),
  getSessionsByClientEmailPaginated: vi.fn(),
  getAudioSignedUrl:   vi.fn(),
}));

vi.mock("../services/DatabaseService.js", () => ({ db: mockDb }));

// ── Build test app ────────────────────────────────────────────────────────────
const { default: sessionsRouter } = await import("./sessions.js");
const app = express();
app.use(express.json());
app.use("/api/sessions", sessionsRouter);

// ── Helpers ───────────────────────────────────────────────────────────────────
const BUCKET = "audio-recordings";
const FAKE_AUDIO_URL =
  `https://project.supabase.co/storage/v1/object/public/${BUCKET}/uploads/audio.webm`;

function fakeSession(overrides = {}) {
  return {
    id: "sess-1",
    createdAt: "2026-01-01T00:00:00Z",
    filename: "audio.webm",
    summary: "Summary",
    providerId: "prov-1",
    clientEmail: "client@test.com",
    audioUrl: FAKE_AUDIO_URL,
    ...overrides,
  };
}

describe("GET /api/sessions/:id/audio (BE-022)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.role  = "provider";
    mockUser.id    = "prov-1";
    mockUser.email = "prov@test.com";
    process.env.SUPABASE_AUDIO_BUCKET = BUCKET;
  });

  it("returns 404 when session does not exist", async () => {
    mockDb.getSessionById.mockResolvedValue(null);
    const res = await request(app)
      .get("/api/sessions/bad-id/audio")
      .set("Authorization", "Bearer tok");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/session not found/i);
  });

  it("returns 403 when provider does not own the session", async () => {
    mockDb.getSessionById.mockResolvedValue(fakeSession({ providerId: "other-prov" }));
    const res = await request(app)
      .get("/api/sessions/sess-1/audio")
      .set("Authorization", "Bearer tok");
    expect(res.status).toBe(403);
  });

  it("returns 403 when client requests audio for another client's session", async () => {
    mockUser.role  = "client";
    mockUser.email = "attacker@test.com";
    mockDb.getSessionById.mockResolvedValue(fakeSession({ clientEmail: "victim@test.com" }));
    const res = await request(app)
      .get("/api/sessions/sess-1/audio")
      .set("Authorization", "Bearer tok");
    expect(res.status).toBe(403);
  });

  it("returns 404 when session has no audioUrl", async () => {
    mockDb.getSessionById.mockResolvedValue(fakeSession({ audioUrl: null }));
    const res = await request(app)
      .get("/api/sessions/sess-1/audio")
      .set("Authorization", "Bearer tok");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no audio/i);
  });

  it("returns 500 when audioUrl does not contain expected bucket path", async () => {
    mockDb.getSessionById.mockResolvedValue(
      fakeSession({ audioUrl: "https://example.com/some/other/url" })
    );
    const res = await request(app)
      .get("/api/sessions/sess-1/audio")
      .set("Authorization", "Bearer tok");
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/storage path/i);
  });

  it("returns signedUrl and expiresIn for valid provider request", async () => {
    mockDb.getSessionById.mockResolvedValue(fakeSession());
    mockDb.getAudioSignedUrl.mockResolvedValue("https://signed.url/audio.webm?token=abc");

    const res = await request(app)
      .get("/api/sessions/sess-1/audio")
      .set("Authorization", "Bearer tok");

    expect(res.status).toBe(200);
    expect(res.body.signedUrl).toBe("https://signed.url/audio.webm?token=abc");
    expect(res.body.expiresIn).toBe(3600);
    // Verify correct storage path extracted
    expect(mockDb.getAudioSignedUrl).toHaveBeenCalledWith("uploads/audio.webm");
  });

  it("returns signedUrl for a valid client request to their own session", async () => {
    mockUser.role  = "client";
    mockUser.email = "client@test.com";
    mockDb.getSessionById.mockResolvedValue(fakeSession({ clientEmail: "client@test.com" }));
    mockDb.getAudioSignedUrl.mockResolvedValue("https://signed.url/audio.webm?token=xyz");

    const res = await request(app)
      .get("/api/sessions/sess-1/audio")
      .set("Authorization", "Bearer tok");

    expect(res.status).toBe(200);
    expect(res.body.signedUrl).toBeDefined();
  });

  it("returns 500 when getAudioSignedUrl returns null", async () => {
    mockDb.getSessionById.mockResolvedValue(fakeSession());
    mockDb.getAudioSignedUrl.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/sessions/sess-1/audio")
      .set("Authorization", "Bearer tok");

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/signed url/i);
  });
});
