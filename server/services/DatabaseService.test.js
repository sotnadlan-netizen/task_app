/**
 * QA-003 — Unit tests for DatabaseService
 *
 * Strategy: mock @supabase/supabase-js with a Proxy-based chainable builder.
 * Every chain method (.from, .select, .eq, …) returns the same Proxy so the
 * final `await` hits our controlled `.then`. Tests call `setResolve()` to
 * choose what the "DB" returns before each assertion.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Supabase mock ─────────────────────────────────────────────────────────────
// A Proxy where every property access either returns a no-op function that
// returns the proxy (chaining), or handles `then` to make it awaitable.
let _resolveWith = { data: null, error: null };
function setResolve(value) { _resolveWith = value; }

function makeChain() {
  return new Proxy({}, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve) => Promise.resolve(_resolveWith).then(resolve);
      }
      if (prop === "catch") return (reject) => Promise.resolve(_resolveWith).catch(reject);
      if (prop === Symbol.toPrimitive) return undefined;
      // Every other property is a function that returns the same chain
      return (..._args) => makeChain();
    },
  });
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockReturnValue({
    from: () => makeChain(),
  }),
}));

process.env.SUPABASE_URL              = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

const { db } = await import("./DatabaseService.js");

// ── Helpers ───────────────────────────────────────────────────────────────────
function fakeSessionRow(overrides = {}) {
  return {
    id:           "sess-1",
    created_at:   "2026-01-01T00:00:00Z",
    filename:     "audio.webm",
    summary:      "Summary text",
    provider_id:  "prov-1",
    client_email: "client@test.com",
    tasks: [],
    ...overrides,
  };
}

function fakeTaskRow(overrides = {}) {
  return {
    id:          "task-1",
    session_id:  "sess-1",
    created_at:  "2026-01-01T00:00:00Z",
    title:       "Do something",
    description: "Details here",
    assignee:    "Advisor",
    priority:    "High",
    completed:   false,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("DatabaseService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── rowToSession mapping ──────────────────────────────────────────────────
  describe("getAllSessions — row mapping", () => {
    it("maps snake_case DB columns to camelCase app fields", async () => {
      setResolve({ data: [fakeSessionRow()], error: null });
      const sessions = await db.getAllSessions();
      expect(sessions[0]).toMatchObject({
        id:          "sess-1",
        createdAt:   "2026-01-01T00:00:00Z",
        filename:    "audio.webm",
        summary:     "Summary text",
        providerId:  "prov-1",
        clientEmail: "client@test.com",
      });
    });

    it("computes taskCount and completedCount from embedded tasks", async () => {
      setResolve({
        data: [fakeSessionRow({ tasks: [
          { id: "t1", completed: true },
          { id: "t2", completed: false },
          { id: "t3", completed: true },
        ]})],
        error: null,
      });
      const [session] = await db.getAllSessions();
      expect(session.taskCount).toBe(3);
      expect(session.completedCount).toBe(2);
    });

    it("handles null summary and client_email gracefully", async () => {
      setResolve({ data: [fakeSessionRow({ summary: null, client_email: null })], error: null });
      const [session] = await db.getAllSessions();
      expect(session.summary).toBe("");
      expect(session.clientEmail).toBeNull();
    });

    it("throws a descriptive error when Supabase returns an error", async () => {
      setResolve({ data: null, error: { message: "connection refused" } });
      await expect(db.getAllSessions()).rejects.toThrow("getAllSessions");
    });

    it("returns empty array when data is null/undefined and no error", async () => {
      setResolve({ data: null, error: null });
      const sessions = await db.getAllSessions();
      expect(sessions).toEqual([]);
    });
  });

  // ── rowToTask mapping ────────────────────────────────────────────────────
  describe("getTasksBySessionId — row mapping", () => {
    it("maps task row fields correctly", async () => {
      setResolve({ data: [fakeTaskRow()], error: null });
      const tasks = await db.getTasksBySessionId("sess-1");
      expect(tasks[0]).toMatchObject({
        id:          "task-1",
        sessionId:   "sess-1",
        title:       "Do something",
        description: "Details here",
        assignee:    "Advisor",
        priority:    "High",
        completed:   false,
      });
    });

    it("defaults description to empty string when DB returns null", async () => {
      setResolve({ data: [fakeTaskRow({ description: null })], error: null });
      const [task] = await db.getTasksBySessionId("sess-1");
      expect(task.description).toBe("");
    });

    it("throws when Supabase returns an error", async () => {
      setResolve({ data: null, error: { message: "query failed" } });
      await expect(db.getTasksBySessionId("sess-1")).rejects.toThrow("getTasksBySessionId");
    });
  });

  // ── getSessionById ───────────────────────────────────────────────────────
  describe("getSessionById", () => {
    it("returns null when Supabase returns an error (not found)", async () => {
      setResolve({ data: null, error: { message: "not found" } });
      const result = await db.getSessionById("missing-id");
      expect(result).toBeNull();
    });

    it("returns a mapped session when found", async () => {
      setResolve({ data: fakeSessionRow(), error: null });
      const session = await db.getSessionById("sess-1");
      expect(session.id).toBe("sess-1");
      expect(session.providerId).toBe("prov-1");
    });
  });

  // ── createProfile ─────────────────────────────────────────────────────────
  describe("createProfile", () => {
    it("returns { ok: true } on success", async () => {
      setResolve({ error: null });
      const result = await db.createProfile({ id: "u1", email: "a@b.com", role: "provider" });
      expect(result).toEqual({ ok: true });
    });

    it("throws when Supabase returns an error", async () => {
      setResolve({ error: { message: "duplicate key" } });
      await expect(db.createProfile({ id: "u1", email: "a@b.com", role: "provider" }))
        .rejects.toThrow("createProfile");
    });
  });

  // ── updateTaskStatus ─────────────────────────────────────────────────────
  describe("updateTaskStatus", () => {
    it("returns the updated task with completed=true", async () => {
      setResolve({ data: fakeTaskRow({ completed: true }), error: null });
      const task = await db.updateTaskStatus("task-1", true);
      expect(task.completed).toBe(true);
    });

    it("throws on DB error", async () => {
      setResolve({ data: null, error: { message: "update failed" } });
      await expect(db.updateTaskStatus("task-1", true)).rejects.toThrow("updateTaskStatus");
    });
  });

  // ── deleteTask ───────────────────────────────────────────────────────────
  describe("deleteTask", () => {
    it("returns { ok: true } on success", async () => {
      setResolve({ error: null });
      const result = await db.deleteTask("task-1");
      expect(result).toEqual({ ok: true });
    });

    it("throws on DB error", async () => {
      setResolve({ error: { message: "foreign key violation" } });
      await expect(db.deleteTask("task-1")).rejects.toThrow("deleteTask");
    });
  });

  // ── saveTasks ────────────────────────────────────────────────────────────
  describe("saveTasks", () => {
    it("returns empty array immediately when given empty input (no DB call)", async () => {
      const result = await db.saveTasks([]);
      expect(result).toEqual([]);
    });

    it("throws when Supabase insert fails", async () => {
      setResolve({ error: { message: "insert error", code: "23505", details: "" } });
      const tasks = [fakeTaskRow()].map((r) => ({
        id: r.id, sessionId: r.session_id, createdAt: r.created_at,
        title: r.title, description: r.description,
        assignee: r.assignee, priority: r.priority, completed: r.completed,
      }));
      await expect(db.saveTasks(tasks)).rejects.toThrow("saveTasks");
    });
  });

  // ── getPromptConfig ──────────────────────────────────────────────────────
  describe("getPromptConfig", () => {
    it("returns the system prompt from DB when present", async () => {
      setResolve({ data: { system_prompt: "custom prompt" }, error: null });
      const config = await db.getPromptConfig();
      expect(config.systemPrompt).toBe("custom prompt");
    });

    it("falls back to the default Hebrew prompt when DB row is missing", async () => {
      // First call (select) fails → triggers upsert
      setResolve({ data: null, error: { message: "no rows" } });
      const config = await db.getPromptConfig();
      // Default prompt starts with the Hebrew system instruction
      expect(config.systemPrompt).toContain("אתה סוכן תיעוד");
    });
  });
});
