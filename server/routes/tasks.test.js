/**
 * QA-009 — Integration tests for tasks routes
 *
 * Covers PATCH /api/tasks/:id completion-toggle permission rules,
 * POST /api/tasks (provider-only creation), and bulk-complete.
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
  getTaskById:          vi.fn(),
  getSessionById:       vi.fn(),
  updateTaskStatus:     vi.fn(),
  updateTaskDetails:    vi.fn(),
  deleteTask:           vi.fn(),
  saveTasks:            vi.fn(),
  getTasksBySessionId:  vi.fn(),
  bulkUpdateTaskStatus: vi.fn(),
}));

vi.mock("../services/DatabaseService.js", () => ({ db: mockDb }));

const { default: tasksRouter } = await import("./tasks.js");
const app = express();
app.use(express.json());
app.use("/api/tasks", tasksRouter);

// ── Helpers ───────────────────────────────────────────────────────────────────
function fakeTask(overrides = {}) {
  return {
    id: "task-1", sessionId: "sess-1", title: "T", description: "",
    assignee: "Advisor", priority: "High", completed: false, ...overrides,
  };
}
function fakeSession(overrides = {}) {
  return { id: "sess-1", providerId: "prov-1", clientEmail: "client@test.com", ...overrides };
}

describe("PATCH /api/tasks/:id — completion toggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.role  = "provider";
    mockUser.id    = "prov-1";
    mockUser.email = "prov@test.com";
  });

  it("returns 404 when task not found", async () => {
    mockDb.getTaskById.mockResolvedValue(null);
    const res = await request(app).patch("/api/tasks/bad-id").set("Authorization", "Bearer tok");
    expect(res.status).toBe(404);
  });

  it("returns 403 when client tries to toggle an Advisor-assigned task", async () => {
    mockUser.role  = "client";
    mockUser.email = "client@test.com";
    mockDb.getTaskById.mockResolvedValue(fakeTask({ assignee: "Advisor" }));
    mockDb.getSessionById.mockResolvedValue(fakeSession());
    const res = await request(app).patch("/api/tasks/task-1").set("Authorization", "Bearer tok");
    expect(res.status).toBe(403);
  });

  it("returns 403 when client tries to toggle a Client task that belongs to another client", async () => {
    mockUser.role  = "client";
    mockUser.email = "attacker@test.com";
    mockDb.getTaskById.mockResolvedValue(fakeTask({ assignee: "Client" }));
    mockDb.getSessionById.mockResolvedValue(fakeSession({ clientEmail: "victim@test.com" }));
    const res = await request(app).patch("/api/tasks/task-1").set("Authorization", "Bearer tok");
    expect(res.status).toBe(403);
  });

  it("allows a client to toggle their own Client task", async () => {
    mockUser.role  = "client";
    mockUser.email = "client@test.com";
    mockDb.getTaskById.mockResolvedValue(fakeTask({ assignee: "Client" }));
    mockDb.getSessionById.mockResolvedValue(fakeSession());
    mockDb.updateTaskStatus.mockResolvedValue(fakeTask({ completed: true }));
    const res = await request(app).patch("/api/tasks/task-1").set("Authorization", "Bearer tok");
    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(true);
  });

  it("returns 403 when provider does not own the session", async () => {
    mockDb.getTaskById.mockResolvedValue(fakeTask());
    mockDb.getSessionById.mockResolvedValue(fakeSession({ providerId: "other" }));
    const res = await request(app).patch("/api/tasks/task-1").set("Authorization", "Bearer tok");
    expect(res.status).toBe(403);
  });

  it("allows a provider to toggle any task in their session", async () => {
    mockDb.getTaskById.mockResolvedValue(fakeTask());
    mockDb.getSessionById.mockResolvedValue(fakeSession());
    mockDb.updateTaskStatus.mockResolvedValue(fakeTask({ completed: true }));
    const res = await request(app).patch("/api/tasks/task-1").set("Authorization", "Bearer tok");
    expect(res.status).toBe(200);
  });
});

describe("POST /api/tasks — manual task creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.role = "provider";
    mockUser.id   = "prov-1";
  });

  it("returns 403 for clients", async () => {
    mockUser.role = "client";
    const res = await request(app)
      .post("/api/tasks")
      .send({ sessionId: "00000000-0000-0000-0000-000000000001", title: "T", assignee: "Advisor", priority: "High" });
    expect(res.status).toBe(403);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .send({ sessionId: "00000000-0000-0000-0000-000000000001", title: "T" }); // missing assignee + priority
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid assignee value", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .send({ sessionId: "00000000-0000-0000-0000-000000000001", title: "T", assignee: "Manager", priority: "High" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid priority value", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .send({ sessionId: "00000000-0000-0000-0000-000000000001", title: "T", assignee: "Advisor", priority: "Critical" });
    expect(res.status).toBe(400);
  });

  it("returns 404 when session does not exist", async () => {
    mockDb.getSessionById.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/tasks")
      .send({ sessionId: "00000000-0000-0000-0000-000000000001", title: "T", assignee: "Advisor", priority: "High" });
    expect(res.status).toBe(404);
  });

  it("creates and returns the task with status 201", async () => {
    mockDb.getSessionById.mockResolvedValue(fakeSession());
    mockDb.saveTasks.mockImplementation(async (tasks) => tasks);
    const res = await request(app)
      .post("/api/tasks")
      .send({ sessionId: "00000000-0000-0000-0000-000000000002", title: "New Task", assignee: "Client", priority: "Medium" });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("New Task");
    expect(res.body.assignee).toBe("Client");
  });
});

describe("PATCH /api/tasks/bulk-complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.role = "provider";
    mockUser.id   = "prov-1";
  });

  it("returns 403 for clients", async () => {
    mockUser.role = "client";
    const res = await request(app)
      .patch("/api/tasks/bulk-complete")
      .send({ taskIds: ["00000000-0000-0000-0000-000000000001"], completed: true });
    expect(res.status).toBe(403);
  });

  it("returns 400 when taskIds is empty", async () => {
    const res = await request(app)
      .patch("/api/tasks/bulk-complete")
      .send({ taskIds: [], completed: true });
    expect(res.status).toBe(400);
  });

  it("returns 400 when completed is not boolean", async () => {
    const res = await request(app)
      .patch("/api/tasks/bulk-complete")
      .send({ taskIds: ["00000000-0000-0000-0000-000000000001"], completed: "yes" });
    expect(res.status).toBe(400);
  });

  it("calls db.bulkUpdateTaskStatus and returns results", async () => {
    mockDb.bulkUpdateTaskStatus.mockResolvedValue([fakeTask({ completed: true })]);
    const res = await request(app)
      .patch("/api/tasks/bulk-complete")
      .send({ taskIds: ["00000000-0000-0000-0000-000000000001"], completed: true });
    expect(res.status).toBe(200);
    expect(res.body[0].completed).toBe(true);
  });
});

describe("DELETE /api/tasks/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.role = "provider";
    mockUser.id   = "prov-1";
  });

  it("returns 404 when task not found", async () => {
    mockDb.getTaskById.mockResolvedValue(null);
    const res = await request(app).delete("/api/tasks/bad").set("Authorization", "Bearer tok");
    expect(res.status).toBe(404);
  });

  it("returns 403 when client tries to delete", async () => {
    mockUser.role = "client";
    mockDb.getTaskById.mockResolvedValue(fakeTask());
    mockDb.getSessionById.mockResolvedValue(fakeSession());
    const res = await request(app).delete("/api/tasks/task-1").set("Authorization", "Bearer tok");
    expect(res.status).toBe(403);
  });

  it("returns { ok: true } on successful delete", async () => {
    mockDb.getTaskById.mockResolvedValue(fakeTask());
    mockDb.getSessionById.mockResolvedValue(fakeSession());
    mockDb.deleteTask.mockResolvedValue({ ok: true });
    const res = await request(app).delete("/api/tasks/task-1").set("Authorization", "Bearer tok");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

// ── BE-018: PATCH /api/tasks/:id/details ─────────────────────────────────────
describe("PATCH /api/tasks/:id/details — edit task metadata (BE-018)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.role = "provider";
    mockUser.id   = "prov-1";
  });

  it("returns 403 when client tries to edit task details", async () => {
    mockUser.role = "client";
    const res = await request(app)
      .patch("/api/tasks/task-1/details")
      .set("Authorization", "Bearer tok")
      .send({ title: "New Title" });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/providers only/i);
  });

  it("returns 400 when no updatable fields are provided", async () => {
    const res = await request(app)
      .patch("/api/tasks/task-1/details")
      .set("Authorization", "Bearer tok")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.details[0].message).toMatch(/at least one/i);
  });

  it("returns 400 when priority is an invalid value", async () => {
    const res = await request(app)
      .patch("/api/tasks/task-1/details")
      .set("Authorization", "Bearer tok")
      .send({ priority: "Critical" });
    expect(res.status).toBe(400);
    expect(res.body.details[0].path).toMatch(/priority/i);
  });

  it("returns 404 when task does not exist", async () => {
    mockDb.getTaskById.mockResolvedValue(null);
    const res = await request(app)
      .patch("/api/tasks/bad-id/details")
      .set("Authorization", "Bearer tok")
      .send({ title: "New Title" });
    expect(res.status).toBe(404);
  });

  it("returns 403 when provider does not own the task's session", async () => {
    mockDb.getTaskById.mockResolvedValue(fakeTask());
    mockDb.getSessionById.mockResolvedValue(fakeSession({ providerId: "other-prov" }));
    const res = await request(app)
      .patch("/api/tasks/task-1/details")
      .set("Authorization", "Bearer tok")
      .send({ title: "New Title" });
    expect(res.status).toBe(403);
  });

  it("updates task title successfully", async () => {
    const updated = fakeTask({ title: "Updated Title" });
    mockDb.getTaskById.mockResolvedValue(fakeTask());
    mockDb.getSessionById.mockResolvedValue(fakeSession());
    mockDb.updateTaskDetails.mockResolvedValue(updated);

    const res = await request(app)
      .patch("/api/tasks/task-1/details")
      .set("Authorization", "Bearer tok")
      .send({ title: "Updated Title" });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Updated Title");
    expect(mockDb.updateTaskDetails).toHaveBeenCalledWith("task-1", {
      title: "Updated Title",
      description: undefined,
      priority: undefined,
    });
  });

  it("updates priority and description simultaneously", async () => {
    const updated = fakeTask({ description: "new desc", priority: "Low" });
    mockDb.getTaskById.mockResolvedValue(fakeTask());
    mockDb.getSessionById.mockResolvedValue(fakeSession());
    mockDb.updateTaskDetails.mockResolvedValue(updated);

    const res = await request(app)
      .patch("/api/tasks/task-1/details")
      .set("Authorization", "Bearer tok")
      .send({ description: "new desc", priority: "Low" });

    expect(res.status).toBe(200);
    expect(res.body.priority).toBe("Low");
  });
});
