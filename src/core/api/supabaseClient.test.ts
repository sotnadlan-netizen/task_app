import { describe, it, expect } from "vitest";
import { supabase } from "./supabaseClient";

describe("supabaseClient", () => {
  it("exports a supabase client instance", () => {
    expect(supabase).toBeDefined();
  });

  it("exposes the auth namespace", () => {
    expect(supabase.auth).toBeDefined();
    expect(typeof supabase.auth.getSession).toBe("function");
    expect(typeof supabase.auth.signOut).toBe("function");
  });

  it("exposes the from() query builder", () => {
    expect(typeof supabase.from).toBe("function");
  });
});
