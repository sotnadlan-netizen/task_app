import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";

vi.mock("@/core/api/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

function TestConsumer() {
  const { user, role, loading } = useAuth();
  if (loading) return <span>loading</span>;
  return <span data-testid="state">{user ? role : "unauthenticated"}</span>;
}

describe("AuthProvider", () => {
  it("renders children without crashing", () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    // either shows loading or unauthenticated
    expect(document.body).toBeTruthy();
  });

  it("exposes unauthenticated state when no session", async () => {
    const { findByTestId } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    const el = await findByTestId("state");
    expect(el.textContent).toBe("unauthenticated");
  });
});
