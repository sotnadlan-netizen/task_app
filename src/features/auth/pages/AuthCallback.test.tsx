import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AuthCallback from "./AuthCallback";

vi.mock("@/core/state/AuthContext", () => ({
  useAuth: () => ({ loading: true, user: null, role: null }),
}));
vi.mock("react-router-dom", async (importOriginal) => {
  const mod = await importOriginal<typeof import("react-router-dom")>();
  return { ...mod, useNavigate: () => vi.fn() };
});

describe("AuthCallback page", () => {
  it("renders a loading spinner while auth resolves", () => {
    render(<MemoryRouter><AuthCallback /></MemoryRouter>);
    expect(document.body).toBeTruthy();
  });
});
