/**
 * BE-032, BE-033 — Integration tests for analytics routes
 *
 * GET  /api/analytics/overview          — task completion rates, session counts (provider-only)
 * GET  /api/analytics/sessions/export   — CSV export with UTF-8 BOM and correct headers
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
  getAnalyticsOverview:         vi.fn(),
  getSessionsWithTasksForExport: vi.fn(),
}));

vi.mock("../services/DatabaseService.js", () => ({ db: mockDb }));

// ── Build test app ────────────────────────────────────────────────────────────
const { default: analyticsRouter } = await import("./analytics.js");
const app = express();
app.use(express.json());
app.use("/api/analytics", analyticsRouter);

// ── Helpers ───────────────────────────────────────────────────────────────────
function fakeOverview(overrides = {}) {
  return {
    totalSessions:  10,
    totalTasks:     40,
    completedTasks: 25,
    completionRate: 63,
    sessionsByMonth: [{ month: "Jan 2026", count: 5 }, { month: "Feb 2026", count: 5 }],
    ...overrides,
  };
}

function fakeExportSession(overrides = {}) {
  return {
    id: "sess-1",
    createdAt: "2026-01-15T10:00:00Z",
    filename: "audio.webm",
    clientEmail: "client@test.com",
    summary: "Meeting summary",
    tasks: [],
    ...overrides,
  };
}

// ── GET /api/analytics/overview ───────────────────────────────────────────────
describe("GET /api/analytics/overview (BE-032)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.role = "provider";
    mockUser.id   = "prov-1";
  });

  it("returns 403 for client role", async () => {
    mockUser.role = "client";
    const res = await request(app).get("/api/analytics/overview").set("Authorization", "Bearer tok");
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/providers only/i);
  });

  it("returns analytics overview for a provider", async () => {
    mockDb.getAnalyticsOverview.mockResolvedValue(fakeOverview());
    const res = await request(app).get("/api/analytics/overview").set("Authorization", "Bearer tok");
    expect(res.status).toBe(200);
    expect(res.body.totalSessions).toBe(10);
    expect(res.body.totalTasks).toBe(40);
    expect(res.body.completedTasks).toBe(25);
    expect(res.body.completionRate).toBe(63);
    expect(Array.isArray(res.body.sessionsByMonth)).toBe(true);
    expect(mockDb.getAnalyticsOverview).toHaveBeenCalledWith("prov-1");
  });

  it("returns 500 when DB throws", async () => {
    mockDb.getAnalyticsOverview.mockRejectedValue(new Error("DB error"));
    const res = await request(app).get("/api/analytics/overview").set("Authorization", "Bearer tok");
    expect(res.status).toBe(500);
  });
});

// ── GET /api/analytics/sessions/export ───────────────────────────────────────
describe("GET /api/analytics/sessions/export (BE-033)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.role = "provider";
    mockUser.id   = "prov-1";
  });

  it("returns 403 for client role", async () => {
    mockUser.role = "client";
    const res = await request(app).get("/api/analytics/sessions/export").set("Authorization", "Bearer tok");
    expect(res.status).toBe(403);
  });

  it("returns CSV with correct content-type and UTF-8 BOM", async () => {
    mockDb.getSessionsWithTasksForExport.mockResolvedValue([
      fakeExportSession({
        tasks: [
          { title: "Task A", description: "Desc", assignee: "Advisor", priority: "High", completed: true },
        ],
      }),
    ]);

    const res = await request(app)
      .get("/api/analytics/sessions/export")
      .set("Authorization", "Bearer tok");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.headers["content-disposition"]).toMatch(/attachment/);
    // UTF-8 BOM (\uFEFF) should be at the start
    expect(res.text.charCodeAt(0)).toBe(0xFEFF);
  });

  it("includes CSV header row with expected columns", async () => {
    mockDb.getSessionsWithTasksForExport.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/analytics/sessions/export")
      .set("Authorization", "Bearer tok");

    expect(res.status).toBe(200);
    const firstLine = res.text.slice(1).split("\n")[0]; // skip BOM
    expect(firstLine).toContain("Session ID");
    expect(firstLine).toContain("Task Title");
    expect(firstLine).toContain("Completed");
  });

  it("emits one row per task when session has tasks", async () => {
    mockDb.getSessionsWithTasksForExport.mockResolvedValue([
      fakeExportSession({
        tasks: [
          { title: "T1", description: "", assignee: "Advisor", priority: "High", completed: false },
          { title: "T2", description: "", assignee: "Client", priority: "Low",  completed: true },
        ],
      }),
    ]);

    const res = await request(app)
      .get("/api/analytics/sessions/export")
      .set("Authorization", "Bearer tok");

    const lines = res.text.slice(1).split("\n").filter(Boolean);
    expect(lines.length).toBe(3); // header + 2 task rows
    expect(lines[1]).toContain("T1");
    expect(lines[2]).toContain("T2");
    expect(lines[2]).toContain("Yes"); // completed = true
  });

  it("emits a placeholder row when session has no tasks", async () => {
    mockDb.getSessionsWithTasksForExport.mockResolvedValue([fakeExportSession()]);

    const res = await request(app)
      .get("/api/analytics/sessions/export")
      .set("Authorization", "Bearer tok");

    const lines = res.text.slice(1).split("\n").filter(Boolean);
    expect(lines.length).toBe(2); // header + 1 empty-task row
    expect(lines[1]).toContain("sess-1");
  });

  it("returns 500 when DB throws", async () => {
    mockDb.getSessionsWithTasksForExport.mockRejectedValue(new Error("fail"));
    const res = await request(app)
      .get("/api/analytics/sessions/export")
      .set("Authorization", "Bearer tok");
    expect(res.status).toBe(500);
  });
});
