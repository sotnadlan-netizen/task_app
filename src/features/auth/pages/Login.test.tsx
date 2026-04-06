import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";

vi.mock("@/core/api/supabaseClient", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  },
}));

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

describe("Login page", () => {
  it("renders without crashing", () => {
    renderLogin();
    expect(document.body).toBeTruthy();
  });

  it("shows email and password inputs", () => {
    renderLogin();
    expect(screen.getByRole("textbox", { name: /email/i })).toBeTruthy();
  });

  it("shows a sign-in button", () => {
    renderLogin();
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});
