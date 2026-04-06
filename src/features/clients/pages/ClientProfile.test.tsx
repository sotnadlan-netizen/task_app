import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ClientProfile from "./ClientProfile";

vi.mock("@/core/utils/storage", () => ({
  apiFetchSessions: vi.fn().mockResolvedValue({ sessions: [], total: 0, page: 1, pageSize: 20 }),
}));
vi.mock("@/shared/components/layout/Layout", () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("ClientProfile page", () => {
  it("renders without crashing", () => {
    render(
      <MemoryRouter initialEntries={["/provider/clients/client@test.com"]}>
        <Routes>
          <Route path="/provider/clients/:clientEmail" element={<ClientProfile />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(document.body).toBeTruthy();
  });
});
