import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Layout } from "./Layout";

vi.mock("@/core/state/AuthContext", () => ({
  useAuth: () => ({
    user: { email: "p@test.com" },
    role: "provider",
    loading: false,
    signOut: vi.fn(),
  }),
}));

describe("Layout", () => {
  it("renders children without crashing", () => {
    render(
      <MemoryRouter>
        <Layout>
          <div data-testid="child">content</div>
        </Layout>
      </MemoryRouter>,
    );
    expect(document.querySelector("[data-testid='child']")).toBeTruthy();
  });
});
