/**
 * FE-037 — Tests for skeleton loading states in SessionList and TaskBoard
 *
 * Verifies that a pulsing skeleton placeholder is rendered while data is
 * being fetched, and is replaced by real content once it arrives.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProviderDashboard from "@/features/dashboard/pages/ProviderDashboard";
import ProviderBoard from "@/features/tasks/pages/ProviderBoard";

// ── Mocks ──────────────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockFetchSessions = vi.hoisted(() => vi.fn());
const mockFetchTasks    = vi.hoisted(() => vi.fn());
vi.mock("@/core/utils/storage", () => ({
  apiFetchSessions:           (...a: unknown[]) => mockFetchSessions(...a),
  apiFetchTasksBySession:     (...a: unknown[]) => mockFetchTasks(...a),
  apiUploadAndProcessAudio:   vi.fn(),
  apiDeleteSession:           vi.fn(),
}));

vi.mock("@/core/state/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" }, role: "provider", loading: false }),
}));

vi.mock("@/shared/components/layout/Layout", () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/features/sessions/components/RecordDialog", () => ({
  RecordDialog: () => null,
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// ── Helpers ───────────────────────────────────────────────────────────────────
function fakeSession(overrides = {}) {
  return {
    id: "s1", createdAt: "2026-01-01T00:00:00Z", filename: "audio.webm",
    summary: "Meeting summary", taskCount: 2, completedCount: 1, providerId: "u1",
    ...overrides,
  };
}

function fakeTask(overrides = {}) {
  return {
    id: "t1", sessionId: "s1", title: "Task Title", description: "",
    assignee: "Advisor" as const, priority: "High" as const,
    completed: false, createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("Skeleton loading states (FE-037)", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── ProviderDashboard — session list skeleton ─────────────────────────────
  it("shows a skeleton while sessions are loading", async () => {
    // Return a promise that never resolves to keep the loading state
    mockFetchSessions.mockReturnValue(new Promise(() => {}));

    const { container } = render(
      <MemoryRouter>
        <ProviderDashboard />
      </MemoryRouter>
    );

    // Skeleton elements have 'animate-pulse' class
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("replaces skeleton with session cards once data loads", async () => {
    mockFetchSessions.mockResolvedValue([fakeSession()]);

    render(
      <MemoryRouter>
        <ProviderDashboard />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(screen.getByText("Meeting summary")).toBeInTheDocument()
    );

    // No skeletons should remain after data loads
    expect(document.querySelector(".animate-pulse")).toBeFalsy();
  });

  it("renders empty state when session list is empty", async () => {
    mockFetchSessions.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <ProviderDashboard />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(screen.getByText(/no sessions yet/i)).toBeInTheDocument()
    );
  });

  // ── ProviderBoard — task board loading spinner ────────────────────────────
  // ProviderBoard shows an animate-spin Loader2 while tasks fetch (not animate-pulse).
  it("shows a loading spinner on the task board while tasks are fetching", async () => {
    mockFetchSessions.mockResolvedValue([fakeSession()]);
    mockFetchTasks.mockReturnValue(new Promise(() => {}));

    const { container } = render(
      <MemoryRouter initialEntries={["/provider/board/s1"]}>
        <Routes>
          <Route path="/provider/board/:sessionId" element={<ProviderBoard />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(container.querySelector(".animate-spin")).toBeTruthy()
    );
  });

  it("replaces task board skeleton with task cards once tasks load", async () => {
    mockFetchSessions.mockResolvedValue([fakeSession()]);
    mockFetchTasks.mockResolvedValue([fakeTask()]);

    render(
      <MemoryRouter initialEntries={["/provider/board/s1"]}>
        <Routes>
          <Route path="/provider/board/:sessionId" element={<ProviderBoard />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(screen.getByText("Task Title")).toBeInTheDocument()
    );

    expect(document.querySelector(".animate-pulse")).toBeFalsy();
  });
});
