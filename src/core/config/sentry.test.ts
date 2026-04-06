import { describe, it, expect } from "vitest";
import { Sentry } from "./sentry";

describe("Sentry stub", () => {
  it("exports a Sentry object", () => {
    expect(Sentry).toBeDefined();
  });

  it("exposes captureException without throwing", () => {
    expect(() => Sentry.captureException(new Error("test"))).not.toThrow();
  });
});
