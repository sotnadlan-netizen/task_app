import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProviderClients from "./ProviderClients";

vi.mock("@/core/state/AuthContext", () => ({
  useAuth: () => ({ user: { id: "p1", email: "p@test.com" }, role: "provider", loading: false }),
}));
vi.mock("@/shared/hooks/useRealtimeSessions", () => ({
  useRealtimeSessions: () => {},
}));
vi.mock("@/core/utils/storage", () => ({
  apiFetchSessions: vi.fn().mockResolvedValue({ sessions: [], total: 0, page: 1, pageSize: 20 }),
}));

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("ProviderClients page", () => {
  it("renders without crashing", () => {
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ProviderClients />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(document.body).toBeTruthy();
  });
});
