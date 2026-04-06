import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/core/api/supabaseClient", () => ({
  supabase: {
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
  },
}));

import { useRealtimeTasks } from "./useRealtimeTasks";

describe("useRealtimeTasks", () => {
  it("runs without throwing", () => {
    expect(() => {
      renderHook(() => useRealtimeTasks({ sessionId: "s1", onUpdate: vi.fn() }));
    }).not.toThrow();
  });
});
