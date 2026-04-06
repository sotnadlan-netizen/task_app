import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ForgotPassword from "./ForgotPassword";

vi.mock("@/core/api/supabaseClient", () => ({
  supabase: {
    auth: { resetPasswordForEmail: vi.fn() },
  },
}));

describe("ForgotPassword page", () => {
  it("renders without crashing", () => {
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    expect(document.body).toBeTruthy();
  });

  it("shows email input", () => {
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    expect(screen.getByRole("textbox", { name: /email/i })).toBeTruthy();
  });
});
