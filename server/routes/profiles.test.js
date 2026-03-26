/**
 * QA-010 — Integration tests for POST /api/profiles
 *
 * Validates that the profile creation endpoint correctly uses the
 * authenticated user's id/email/role from the JWT middleware.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const mockUser = vi.hoisted(() => ({ id: "user-1", email: "prov@test.com", role: "provider" }));

vi.mock("../middleware/authMiddleware.js", () => ({
  requireAuth: (req, _res, next) => {
    req.user = mockUser;
    next();
  },
}));

const mockDb = vi.hoisted(() => ({ createProfile: vi.fn() }));
vi.mock("../services/DatabaseService.js", () => ({ db: mockDb }));

const { default: profilesRouter } = await import("./profiles.js");
const app = express();
app.use(express.json());
app.use("/api/profiles", profilesRouter);

describe("POST /api/profiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.id    = "user-1";
    mockUser.email = "prov@test.com";
    mockUser.role  = "provider";
  });

  it("returns { ok: true } on successful profile creation", async () => {
    mockDb.createProfile.mockResolvedValue({ ok: true });
    const res = await request(app).post("/api/profiles").set("Authorization", "Bearer tok");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("passes the authenticated user's id, email, and role to the DB", async () => {
    mockDb.createProfile.mockResolvedValue({ ok: true });
    await request(app).post("/api/profiles").set("Authorization", "Bearer tok");
    expect(mockDb.createProfile).toHaveBeenCalledWith({
      id:    "user-1",
      email: "prov@test.com",
      role:  "provider",
    });
  });

  it("persists a client role when user signs up as client", async () => {
    mockUser.role  = "client";
    mockUser.email = "client@test.com";
    mockDb.createProfile.mockResolvedValue({ ok: true });
    await request(app).post("/api/profiles").set("Authorization", "Bearer tok");
    expect(mockDb.createProfile).toHaveBeenCalledWith(
      expect.objectContaining({ role: "client" })
    );
  });

  it("returns 500 when the database throws", async () => {
    mockDb.createProfile.mockRejectedValue(new Error("Supabase error"));
    const res = await request(app).post("/api/profiles").set("Authorization", "Bearer tok");
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error");
  });
});
