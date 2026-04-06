/**
 * FE-024 — Tests for ClientBoard (client task board)
 *
 * Verifies that Advisor Tasks are read-only (disabled checkbox, no toggle),
 * Client Tasks are interactive (checkbox enabled, toggle fires), loading/empty
 * states, session summary card, and the "All Done" celebration banner.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ClientBoard from "@/features/sessions/pages/ClientBoard";

// ── Mock react-router-dom ─────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── Mock @/core/utils/storage ────────────────────────────────────────────────────────
const mockFetchTasks    = vi.hoisted(() => vi.fn());
const mockFetchSessions = vi.hoisted(() => vi.fn());
const mockToggleTask    = vi.hoisted(() => vi.fn());

vi.mock("@/core/utils/storage", () => ({
  apiFetchTasksBySession: (...a: unknown[]) => mockFetchTasks(...a),
  apiFetchSessions:       (...a: unknown[]) => mockFetchSessions(...a),
  apiToggleTask:          (...a: unknown[]) => mockToggleTask(...a),
}));

// ── Mock useRealtimeTasks (no-op in tests) ────────────────────────────────────
vi.mock("@/shared/hooks/useRealtimeTasks", () => ({
  useRealtimeTasks: () => undefined,
}));

// ── Mock ClientLayout ─────────────────────────────────────────────────────────
vi.mock("@/shared/components/layout/ClientLayout", () => ({
  ClientLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// ── Helpers ───────────────────────────────────────────────────────────────────
function fakeTask(overrides = {}) {
  return {
    id: "t1", sessionId: "sess-1", title: "Test Task", description: "Desc",
    assignee: "Advisor" as const, priority: "High" as const,
    completed: false, createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function fakeSession(overrides = {}) {
  return {
    id: "sess-1", createdAt: "2026-01-01T00:00:00Z", filename: "audio.webm",
    summary: "We discussed mortgage rates.", taskCount: 2, completedCount: 1,
    providerId: "prov-1", clientEmail: "client@test.com",
    ...overrides,
  };
}

function renderBoard(sessionId = "sess-1") {
  return render(
    <MemoryRouter initialEntries={[`/client/board/${sessionId}`]}>
      <Routes>
        <Route path="/client/board/:sessionId" element={<ClientBoard />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ClientBoard (FE-024)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchSessions.mockResolvedValue([fakeSession()]);
  });

  // ── Loading & empty states ────────────────────────────────────────────────
  it("shows a loading spinner while tasks are fetching", async () => {
    mockFetchTasks.mockReturnValue(new Promise(() => {}));
    const { container } = renderBoard();
    await waitFor(() => expect(container.querySelector(".animate-spin")).toBeTruthy());
  });

  it("shows 'No tasks for this session' when task list is empty", async () => {
    mockFetchTasks.mockResolvedValue([]);
    renderBoard();
    await waitFor(() =>
      expect(screen.getByText(/no tasks for this session/i)).toBeInTheDocument()
    );
  });

  // ── Session summary card ──────────────────────────────────────────────────
  it("renders the session summary card with summary text", async () => {
    mockFetchTasks.mockResolvedValue([fakeTask()]);
    renderBoard();
    await waitFor(() =>
      expect(screen.getByText("We discussed mortgage rates.")).toBeInTheDocument()
    );
  });

  it("shows pending task count in the summary card", async () => {
    mockFetchTasks.mockResolvedValue([
      fakeTask({ id: "t1", assignee: "Advisor", completed: false }),
      fakeTask({ id: "t2", assignee: "Client", completed: false }),
    ]);
    renderBoard();
    await waitFor(() =>
      expect(screen.getByText("2")).toBeInTheDocument() // 2 pending
    );
  });

  // ── FE-024: Advisor column is read-only ────────────────────────────────────
  it("renders Advisor Tasks column with 'read-only' badge", async () => {
    mockFetchTasks.mockResolvedValue([fakeTask({ assignee: "Advisor" })]);
    renderBoard();
    await waitFor(() => {
      expect(screen.getByText("Advisor Tasks")).toBeInTheDocument();
      expect(screen.getByText("read-only")).toBeInTheDocument();
    });
  });

  it("advisor task checkbox is disabled (cannot be toggled)", async () => {
    mockFetchTasks.mockResolvedValue([fakeTask({ assignee: "Advisor", title: "Advisor Task" })]);
    renderBoard();
    await waitFor(() => screen.getByText("Advisor Task"));

    // The AdvisorTaskCard renders a disabled checkbox
    const checkboxes = screen.getAllByRole("checkbox");
    const advisorCheckbox = checkboxes[0];
    expect(advisorCheckbox).toBeDisabled();
    // Clicking should not call toggle
    fireEvent.click(advisorCheckbox);
    expect(mockToggleTask).not.toHaveBeenCalled();
  });

  it("renders client tasks in the 'My Tasks' column as interactive", async () => {
    mockFetchTasks.mockResolvedValue([
      fakeTask({ id: "c1", assignee: "Client", title: "Client Task" }),
    ]);
    renderBoard();
    await waitFor(() => {
      expect(screen.getByText("My Tasks")).toBeInTheDocument();
      expect(screen.getByText("Client Task")).toBeInTheDocument();
    });

    // The ClientTaskCard checkbox should NOT be disabled
    const checkboxes = screen.getAllByRole("checkbox");
    const clientCheckbox = checkboxes[0];
    expect(clientCheckbox).not.toBeDisabled();
  });

  it("calls apiToggleTask when a client task checkbox is changed", async () => {
    const task = fakeTask({ id: "c1", assignee: "Client", title: "Client Task" });
    mockFetchTasks.mockResolvedValue([task]);
    mockToggleTask.mockResolvedValue({ ...task, completed: true });
    renderBoard();

    await waitFor(() => screen.getByText("Client Task"));
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    await waitFor(() => expect(mockToggleTask).toHaveBeenCalledWith("c1"));
  });

  it("does NOT call apiToggleTask when an advisor task card area is clicked", async () => {
    mockFetchTasks.mockResolvedValue([
      fakeTask({ id: "a1", assignee: "Advisor", title: "Advisor Only" }),
    ]);
    renderBoard();
    await waitFor(() => screen.getByText("Advisor Only"));

    // Click on the advisor card (div with cursor-not-allowed)
    fireEvent.click(screen.getByText("Advisor Only"));
    expect(mockToggleTask).not.toHaveBeenCalled();
  });

  // ── Pending count badge ───────────────────────────────────────────────────
  it("shows correct 'N pending' count in My Tasks header", async () => {
    mockFetchTasks.mockResolvedValue([
      fakeTask({ id: "c1", assignee: "Client", completed: false }),
      fakeTask({ id: "c2", assignee: "Client", completed: false }),
      fakeTask({ id: "c3", assignee: "Client", completed: true }),
    ]);
    renderBoard();
    await waitFor(() => expect(screen.getByText("2 pending")).toBeInTheDocument());
  });

  // ── "All Done" celebration ────────────────────────────────────────────────
  it("shows 'All Done!' banner when all client tasks are completed", async () => {
    mockFetchTasks.mockResolvedValue([
      fakeTask({ id: "c1", assignee: "Client", completed: true }),
    ]);
    renderBoard();
    await waitFor(() => expect(screen.getByText("All Done!")).toBeInTheDocument());
  });

  it("does NOT show 'All Done!' when some client tasks are still pending", async () => {
    mockFetchTasks.mockResolvedValue([
      fakeTask({ id: "c1", assignee: "Client", completed: false }),
      fakeTask({ id: "c2", assignee: "Client", completed: true }),
    ]);
    renderBoard();
    await waitFor(() => screen.getByText("My Tasks"));
    expect(screen.queryByText("All Done!")).not.toBeInTheDocument();
  });

  // ── Navigation ─────────────────────────────────────────────────────────────
  it("Back button navigates to /client/dashboard", async () => {
    mockFetchTasks.mockResolvedValue([]);
    renderBoard();
    await waitFor(() => screen.getByText(/my sessions/i));
    fireEvent.click(screen.getByText(/my sessions/i));
    expect(mockNavigate).toHaveBeenCalledWith("/client/dashboard");
  });
});
