import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/core/api/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "tok123" } },
      }),
      refreshSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "new-tok" } },
        error: null,
      }),
    },
  },
}));

import { apiFetch } from "./apiClient";

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn();
});
afterEach(() => {
  global.fetch = originalFetch;
  vi.clearAllMocks();
});

describe("apiFetch", () => {
  it("makes a GET request to the given path", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const result = await apiFetch("/api/test");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/test"),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    // apiFetch returns a raw Response object
    expect(result).toBeInstanceOf(Response);
  });

  it("attaches Authorization header when session exists", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 }),
    );
    await apiFetch("/api/sessions");
    const [, options] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)["Authorization"]).toContain("Bearer");
  });

  it("returns the Response object (non-ok does not throw)", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Not Found" }), { status: 404 }),
    );
    const res = await apiFetch("/api/missing");
    expect(res.status).toBe(404);
    expect(res.ok).toBe(false);
  });
});
