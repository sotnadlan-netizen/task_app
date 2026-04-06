import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIsMobile } from "./use-mobile";

describe("useIsMobile", () => {
  it("returns a boolean", () => {
    const { result } = renderHook(() => useIsMobile());
    expect(typeof result.current).toBe("boolean");
  });

  it("returns false in jsdom (no media query matches)", () => {
    // jsdom's matchMedia always returns false (see setup.ts)
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });
});
