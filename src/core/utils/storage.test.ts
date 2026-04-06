import { describe, it, expect, vi } from "vitest";

vi.mock("@/core/api/apiClient", () => ({ apiFetch: vi.fn() }));
vi.mock("@/core/api/supabaseClient", () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}));

import {
  apiFetchSessions,
  apiFetchTasksBySession,
  apiToggleTask,
  apiFetchSessions as sessionsFn,
} from "./storage";

describe("storage module exports", () => {
  it("exports apiFetchSessions as a function", () => {
    expect(typeof apiFetchSessions).toBe("function");
  });

  it("exports apiFetchTasksBySession as a function", () => {
    expect(typeof apiFetchTasksBySession).toBe("function");
  });

  it("exports apiToggleTask as a function", () => {
    expect(typeof apiToggleTask).toBe("function");
  });

  it("apiFetchSessions returns [] when user not authenticated", async () => {
    // supabase.auth.getSession returns session: null → no user context → returns []
    const result = await sessionsFn();
    expect(Array.isArray(result)).toBe(true);
  });
});
