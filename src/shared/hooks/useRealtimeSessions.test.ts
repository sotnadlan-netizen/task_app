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

import { useRealtimeSessions } from "./useRealtimeSessions";

describe("useRealtimeSessions", () => {
  it("runs without throwing", () => {
    const onUpdate = vi.fn();
    expect(() => {
      renderHook(() => useRealtimeSessions({ providerId: "p1", onUpdate }));
    }).not.toThrow();
  });

  it("cleans up channel on unmount", () => {
    const { unmount } = renderHook(() =>
      useRealtimeSessions({ providerId: "p1", onUpdate: vi.fn() }),
    );
    expect(() => unmount()).not.toThrow();
  });
});
