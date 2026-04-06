import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ClientLayout } from "./ClientLayout";

vi.mock("@/core/state/AuthContext", () => ({
  useAuth: () => ({
    user: { email: "c@test.com" },
    role: "client",
    loading: false,
    signOut: vi.fn(),
  }),
}));
vi.mock("react-router-dom", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router-dom")>();
  return { ...mod, useNavigate: () => vi.fn() };
});

describe("ClientLayout", () => {
  it("renders the title", () => {
    render(
      <MemoryRouter>
        <ClientLayout title="My Tasks">
          <div>body</div>
        </ClientLayout>
      </MemoryRouter>,
    );
    expect(screen.getByText("My Tasks")).toBeTruthy();
  });

  it("renders children", () => {
    render(
      <MemoryRouter>
        <ClientLayout title="T"><span data-testid="slot">slot</span></ClientLayout>
      </MemoryRouter>,
    );
    expect(document.querySelector("[data-testid='slot']")).toBeTruthy();
  });
});
