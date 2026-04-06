import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/features/auth/components/ProtectedRoute";

// ── Mock AuthContext ──────────────────────────────────────────────────────────
const mockAuthValue = vi.hoisted(() => ({
  user: null as object | null,
  role: null as string | null,
  loading: false,
}));

vi.mock("@/core/state/AuthContext", () => ({
  useAuth: () => mockAuthValue,
}));

function renderRoute(
  requiredRole: "provider" | "client",
  options: { initialPath?: string } = {}
) {
  const { initialPath = "/protected" } = options;
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<ProtectedRoute requiredRole={requiredRole} />}>
          <Route path="/protected" element={<div>Protected Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/provider/dashboard" element={<div>Provider Dashboard</div>} />
        <Route path="/client/dashboard" element={<div>Client Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("shows a loading spinner while auth is loading", () => {
    mockAuthValue.user = null;
    mockAuthValue.role = null;
    mockAuthValue.loading = true;

    const { container } = render(
      <MemoryRouter>
        <Routes>
          <Route element={<ProtectedRoute requiredRole="provider" />}>
            <Route path="/" element={<div>Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("redirects to /login when user is not authenticated", () => {
    mockAuthValue.user = null;
    mockAuthValue.role = null;
    mockAuthValue.loading = false;

    renderRoute("provider");
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("redirects a provider to /provider/dashboard when client route is required", () => {
    mockAuthValue.user = { id: "u1" };
    mockAuthValue.role = "provider";
    mockAuthValue.loading = false;

    renderRoute("client");
    expect(screen.getByText("Provider Dashboard")).toBeInTheDocument();
  });

  it("redirects a client to /client/dashboard when provider route is required", () => {
    mockAuthValue.user = { id: "u2" };
    mockAuthValue.role = "client";
    mockAuthValue.loading = false;

    renderRoute("provider");
    expect(screen.getByText("Client Dashboard")).toBeInTheDocument();
  });

  it("renders the outlet when user has the correct role (provider)", () => {
    mockAuthValue.user = { id: "u3" };
    mockAuthValue.role = "provider";
    mockAuthValue.loading = false;

    renderRoute("provider");
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("renders the outlet when user has the correct role (client)", () => {
    mockAuthValue.user = { id: "u4" };
    mockAuthValue.role = "client";
    mockAuthValue.loading = false;

    renderRoute("client");
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });
});
