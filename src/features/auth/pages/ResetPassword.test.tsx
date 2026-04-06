import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ResetPassword from "./ResetPassword";

vi.mock("@/core/api/supabaseClient", () => ({
  supabase: {
    auth: { updateUser: vi.fn() },
  },
}));
vi.mock("react-router-dom", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router-dom")>();
  return { ...mod, useNavigate: () => vi.fn() };
});

describe("ResetPassword page", () => {
  it("renders without crashing", () => {
    render(<MemoryRouter><ResetPassword /></MemoryRouter>);
    expect(document.body).toBeTruthy();
  });
});
