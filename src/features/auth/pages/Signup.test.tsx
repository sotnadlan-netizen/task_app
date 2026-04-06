import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Signup from "./Signup";

vi.mock("@/core/api/supabaseClient", () => ({
  supabase: {
    auth: { signUp: vi.fn() },
  },
}));

describe("Signup page", () => {
  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });

  it("shows email input", () => {
    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );
    expect(screen.getByRole("textbox", { name: /email/i })).toBeTruthy();
  });

  it("shows provider and client role options", () => {
    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>,
    );
    // role labels come from i18n — setup.ts maps them
    expect(screen.getByText("יועץ / ספק")).toBeTruthy();
    expect(screen.getByText("לקוח")).toBeTruthy();
  });
});
