import { describe, it, expect } from "vitest";
import { FEATURES_REGISTRY as FEATURES, FEATURE_STATUS_ORDER } from "./features_registry";

describe("features_registry", () => {
  it("exports a non-empty FEATURES array", () => {
    expect(Array.isArray(FEATURES)).toBe(true);
    expect(FEATURES.length).toBeGreaterThan(0);
  });

  it("every feature has required fields", () => {
    for (const f of FEATURES) {
      expect(f).toHaveProperty("id");
      expect(f).toHaveProperty("titleKey");
      expect(f).toHaveProperty("status");
      expect(typeof f.id).toBe("string");
      expect(typeof f.titleKey).toBe("string");
    }
  });

  it("all status values are valid enum members", () => {
    const valid = new Set(["active", "new", "beta", "coming-soon"]);
    for (const f of FEATURES) {
      expect(valid.has(f.status), `Invalid status "${f.status}" on feature "${f.id}"`).toBe(true);
    }
  });

  it("FEATURE_STATUS_ORDER contains expected statuses", () => {
    expect(FEATURE_STATUS_ORDER).toContain("active");
    expect(FEATURE_STATUS_ORDER).toContain("beta");
  });

  it("all IDs are unique", () => {
    const ids = FEATURES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
