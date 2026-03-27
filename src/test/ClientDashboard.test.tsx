/**
 * FE-022, FE-023 — Tests for ClientDashboard page
 *
 * Verifies loading state, empty state, session table rendering, per-session
 * task progress display, status badges, and new-session notification banner.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ClientDashboard from "@/pages/client/ClientDashboard";

// ── Mock react-router-dom ─────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── Mock @/lib/storage ────────────────────────────────────────────────────────
const mockFetchSessions = vi.hoisted(() => vi.fn());
vi.mock("@/lib/storage", () => ({
  apiFetchSessions: (...a: unknown[]) => mockFetchSessions(...a),
}));

// ── Mock ClientLayout ─────────────────────────────────────────────────────────
vi.mock("@/components/layouts/ClientLayout", () => ({
  ClientLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ── Mock sub-components that are standalone features ─────────────────────────
vi.mock("@/components/client/ProgressGraph", () => ({
  ProgressGraph: () => <div data-testid="progress-graph" />,
}));
vi.mock("@/components/client/TimeCapsule", () => ({
  TimeCapsule: () => <div data-testid="time-capsule" />,
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// ── Helpers ───────────────────────────────────────────────────────────────────
function fakeSession(overrides = {}) {
  return {
    id: "s1",
    createdAt: new Date(Date.now() - 60_000).toISOString(), // 1 min ago
    filename: "audio.webm",
    summary: "Meeting with client about mortgage",
    taskCount: 4,
    completedCount: 2,
    providerId: "prov-1",
    clientEmail: "client@test.com",
    ...overrides,
  };
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <ClientDashboard />
    </MemoryRouter>
  );
}

describe("ClientDashboard (FE-022 / FE-023)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage so "new session" banner logic is predictable
    localStorage.clear();
  });

  // ── FE-022: basic rendering ───────────────────────────────────────────────
  it("shows a loading spinner while sessions are fetching", () => {
    mockFetchSessions.mockReturnValue(new Promise(() => {}));
    const { container } = renderDashboard();
    expect(container.querySelector("svg.animate-spin")).toBeTruthy();
  });

  it("shows 'No sessions yet' when the list is empty", async () => {
    mockFetchSessions.mockResolvedValue([]);
    renderDashboard();

    await waitFor(() =>
      expect(screen.getByText(/no sessions yet/i)).toBeInTheDocument()
    );
  });

  it("renders session rows with filename/summary when data loads", async () => {
    mockFetchSessions.mockResolvedValue([fakeSession()]);
    renderDashboard();

    await waitFor(() =>
      expect(screen.getByText("Meeting with client about mortgage")).toBeInTheDocument()
    );
  });

  it("renders KPI stat cards (Total Sessions, Active Sessions, etc.)", async () => {
    mockFetchSessions.mockResolvedValue([fakeSession()]);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/total sessions/i)).toBeInTheDocument();
      expect(screen.getByText(/active sessions/i)).toBeInTheDocument();
      expect(screen.getByText(/total tasks/i)).toBeInTheDocument();
      expect(screen.getByText(/completed tasks/i)).toBeInTheDocument();
    });
  });

  // ── FE-023: per-session task progress ─────────────────────────────────────
  it("shows task completion progress 'N/M' for a session", async () => {
    mockFetchSessions.mockResolvedValue([fakeSession({ taskCount: 5, completedCount: 3 })]);
    renderDashboard();

    await waitFor(() => {
      // "3" appears in the stat card and in the table progress cell — both are valid
      expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
      // The task-count denominator is rendered in its own <span>
      expect(screen.getAllByText(/\/\s*5/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows 'Active' status badge for an in-progress session", async () => {
    mockFetchSessions.mockResolvedValue([fakeSession({ taskCount: 4, completedCount: 2 })]);
    renderDashboard();

    await waitFor(() =>
      expect(screen.getByText(/active/i)).toBeInTheDocument()
    );
  });

  it("shows 'Complete' status badge when all tasks are done", async () => {
    mockFetchSessions.mockResolvedValue([
      fakeSession({ taskCount: 3, completedCount: 3 }),
    ]);
    renderDashboard();

    await waitFor(() =>
      expect(screen.getByText(/complete/i)).toBeInTheDocument()
    );
  });

  it("shows 'No tasks' badge when session has no tasks", async () => {
    mockFetchSessions.mockResolvedValue([fakeSession({ taskCount: 0, completedCount: 0 })]);
    renderDashboard();

    await waitFor(() =>
      expect(screen.getByText(/no tasks/i)).toBeInTheDocument()
    );
  });

  it("clicking 'View Tasks' button navigates to the client board", async () => {
    mockFetchSessions.mockResolvedValue([fakeSession({ id: "sess-42" })]);
    renderDashboard();

    await waitFor(() => screen.getByRole("button", { name: /view tasks/i }));
    fireEvent.click(screen.getByRole("button", { name: /view tasks/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/client/board/sess-42");
  });

  // ── New-session notification banner ──────────────────────────────────────
  it("shows notification banner when there is a new session since last visit", async () => {
    // Set lastVisit to a time well before session.createdAt
    localStorage.setItem("client_last_visit", "0");
    mockFetchSessions.mockResolvedValue([fakeSession()]);
    renderDashboard();

    await waitFor(() =>
      expect(screen.getByText(/new session has been shared with you/i)).toBeInTheDocument()
    );
  });

  it("dismisses the banner when the X button is clicked", async () => {
    localStorage.setItem("client_last_visit", "0");
    mockFetchSessions.mockResolvedValue([fakeSession()]);
    renderDashboard();

    await waitFor(() => screen.getByText(/new session has been shared with you/i));
    // Find dismiss button (aria-label not set, so find by role/icon proximity)
    const dismissBtn = screen.getByRole("button", { name: "" });
    fireEvent.click(dismissBtn);

    expect(screen.queryByText(/new session has been shared with you/i)).not.toBeInTheDocument();
  });

  it("renders ProgressGraph and TimeCapsule components after load", async () => {
    mockFetchSessions.mockResolvedValue([fakeSession({ summary: "Some summary" })]);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByTestId("progress-graph")).toBeInTheDocument();
      expect(screen.getByTestId("time-capsule")).toBeInTheDocument();
    });
  });
});
