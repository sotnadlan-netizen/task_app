import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProviderDashboard from "./ProviderDashboard";

vi.mock("@/core/state/AuthContext", () => ({
  useAuth: () => ({ user: { id: "p1", email: "p@test.com" }, role: "provider", loading: false }),
}));
vi.mock("@/shared/hooks/useRealtimeSessions", () => ({
  useRealtimeSessions: () => {},
}));
vi.mock("@/core/utils/storage", () => ({
  apiFetchSessions: vi.fn().mockResolvedValue({ sessions: [], total: 0, page: 1, pageSize: 20 }),
}));

describe("ProviderDashboard page", () => {
  it("renders without crashing", () => {
    render(<MemoryRouter><ProviderDashboard /></MemoryRouter>);
    expect(document.body).toBeTruthy();
  });
});
