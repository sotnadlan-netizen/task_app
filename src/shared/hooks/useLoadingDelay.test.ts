import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLoadingDelay } from "./useLoadingDelay";

describe("useLoadingDelay", () => {
  it("returns false initially even when loading=true (debounce)", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useLoadingDelay(true));
    expect(result.current).toBe(false);
    vi.useRealTimers();
  });

  it("returns true after delay when loading stays true", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useLoadingDelay(true));
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe(true);
    vi.useRealTimers();
  });

  it("returns false immediately when loading=false", () => {
    const { result } = renderHook(() => useLoadingDelay(false));
    expect(result.current).toBe(false);
  });
});
