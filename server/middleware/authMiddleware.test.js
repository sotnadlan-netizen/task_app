import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock @supabase/supabase-js before importing the middleware ────────────────
const mockGetUser = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockReturnValue({
    auth: { getUser: mockGetUser },
  }),
}));

process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_ANON_KEY = "test-anon-key";

const { requireAuth } = await import("./authMiddleware.js");

function makeReqRes(authHeader) {
  const req = { headers: { authorization: authHeader } };
  const res = {
    _status: null,
    _body: null,
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
  };
  const next = vi.fn();
  return { req, res, next };
}

describe("requireAuth middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when Authorization header is missing", async () => {
    const { req, res, next } = makeReqRes(undefined);
    await requireAuth(req, res, next);
    expect(res._status).toBe(401);
    expect(res._body).toEqual({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token is invalid (Supabase returns error)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "Invalid JWT" } });

    const { req, res, next } = makeReqRes("Bearer bad-token");
    await requireAuth(req, res, next);
    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when Supabase returns null user without error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { req, res, next } = makeReqRes("Bearer some-token");
    await requireAuth(req, res, next);
    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() and sets req.user for a valid provider token", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: "user-123", email: "provider@test.com", user_metadata: { role: "provider" } },
      },
      error: null,
    });

    const { req, res, next } = makeReqRes("Bearer valid-token");
    await requireAuth(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual({ id: "user-123", email: "provider@test.com", role: "provider" });
  });

  it("calls next() and sets req.user for a valid client token", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: "user-456", email: "client@test.com", user_metadata: { role: "client" } },
      },
      error: null,
    });

    const { req, res, next } = makeReqRes("Bearer valid-client-token");
    await requireAuth(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.user.role).toBe("client");
  });

  it("defaults role to 'provider' when user_metadata.role is absent", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: "user-789", email: "nometa@test.com", user_metadata: {} },
      },
      error: null,
    });

    const { req, res, next } = makeReqRes("Bearer valid-token");
    await requireAuth(req, res, next);
    expect(req.user.role).toBe("provider");
  });
});
