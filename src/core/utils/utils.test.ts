import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn()", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "excluded", "included")).toBe("base included");
  });

  it("deduplicates tailwind classes (last wins)", () => {
    const result = cn("p-4", "p-8");
    expect(result).toBe("p-8");
  });

  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });
});
