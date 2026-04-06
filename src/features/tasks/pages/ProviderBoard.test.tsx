/**
 * FE-017, FE-018, FE-021 — Tests for ProviderBoard (TaskCard, Column behaviours)
 *
 * ProviderBoard is rendered with mocked storage calls and a pre-seeded task list
 * so we can exercise the inline editing, add-task form, and "All Done" banner
 * without hitting a real API.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProviderBoard from "@/features/tasks/pages/ProviderBoard";

// ── Mock react-router-dom navigate ────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── Mock @/core/utils/storage ────────────────────────────────────────────────────────
const mockFetchTasks    = vi.fn();
const mockFetchSessions = vi.fn();
const mockToggleTask    = vi.fn();
const mockCreateTask    = vi.fn();
const mockUpdateTask    = vi.fn();
const mockDeleteTask    = vi.fn();

vi.mock("@/core/utils/storage", () => ({
  apiFetchTasksBySession: (...a: unknown[]) => mockFetchTasks(...a),
  apiFetchSessions:       (...a: unknown[]) => mockFetchSessions(...a),
  apiToggleTask:          (...a: unknown[]) => mockToggleTask(...a),
  apiCreateTask:          (...a: unknown[]) => mockCreateTask(...a),
  apiUpdateTaskDetails:   (...a: unknown[]) => mockUpdateTask(...a),
  apiDeleteTask:          (...a: unknown[]) => mockDeleteTask(...a),
}));

// ── Mock sonner toast ─────────────────────────────────────────────────────────
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// ── Mock Layout (avoids AuthContext + Supabase deps) ─────────────────────────
vi.mock("@/shared/components/layout/Layout", () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeTask(overrides = {}) {
  return {
    id: "t1", sessionId: "sess-1", title: "Advisor Task 1",
    description: "Desc", assignee: "Advisor" as const,
    priority: "High" as const, completed: false, createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function fakeSession() {
  return { id: "sess-1", createdAt: "2026-01-01T00:00:00Z", filename: "audio.webm",
           summary: "Test summary", taskCount: 1, completedCount: 0, providerId: "prov-1" };
}

function renderBoard() {
  return render(
    <MemoryRouter initialEntries={["/provider/board/sess-1"]}>
      <Routes>
        <Route path="/provider/board/:sessionId" element={<ProviderBoard />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProviderBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchSessions.mockResolvedValue([fakeSession()]);
  });

  // ── FE-014: Two-column Kanban ─────────────────────────────────────────────
  it("renders Advisor Tasks and Client Tasks columns", async () => {
    mockFetchTasks.mockResolvedValue([makeTask()]);
    renderBoard();
    await waitFor(() => {
      expect(screen.getByText("Advisor Tasks")).toBeInTheDocument();
      expect(screen.getByText("Client Tasks")).toBeInTheDocument();
    });
  });

  // ── FE-016: Priority badges with Hebrew labels ────────────────────────────
  it("renders Hebrew priority badge for High priority", async () => {
    mockFetchTasks.mockResolvedValue([makeTask({ priority: "High" })]);
    renderBoard();
    await waitFor(() => expect(screen.getByText("גבוהה")).toBeInTheDocument());
  });

  it("renders Hebrew priority badge for Medium priority", async () => {
    mockFetchTasks.mockResolvedValue([makeTask({ priority: "Medium" })]);
    renderBoard();
    await waitFor(() => expect(screen.getByText("בינונית")).toBeInTheDocument());
  });

  it("renders Hebrew priority badge for Low priority", async () => {
    mockFetchTasks.mockResolvedValue([makeTask({ priority: "Low" })]);
    renderBoard();
    await waitFor(() => expect(screen.getByText("נמוכה")).toBeInTheDocument());
  });

  // ── FE-017: Add task form ─────────────────────────────────────────────────
  it("shows add-task form when + button is clicked", async () => {
    mockFetchTasks.mockResolvedValue([makeTask()]);
    renderBoard();
    await waitFor(() => screen.getByText("Advisor Tasks"));

    const addButtons = screen.getAllByTitle(/add task for/i);
    fireEvent.click(addButtons[0]);

    expect(screen.getByPlaceholderText("Task title *")).toBeInTheDocument();
  });

  it("Add button is disabled when task title is empty", async () => {
    mockFetchTasks.mockResolvedValue([makeTask()]);
    renderBoard();
    await waitFor(() => screen.getByText("Advisor Tasks"));

    fireEvent.click(screen.getAllByTitle(/add task for/i)[0]);
    expect(screen.getByRole("button", { name: /^add$/i })).toBeDisabled();
  });

  it("calls apiCreateTask when a valid task is submitted", async () => {
    const newTask = makeTask({ id: "t-new", title: "New Task" });
    mockFetchTasks.mockResolvedValue([makeTask()]);
    mockCreateTask.mockResolvedValue(newTask);
    renderBoard();
    await waitFor(() => screen.getByText("Advisor Tasks"));

    fireEvent.click(screen.getAllByTitle(/add task for/i)[0]);
    fireEvent.change(screen.getByPlaceholderText("Task title *"), {
      target: { value: "New Task" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() => expect(mockCreateTask).toHaveBeenCalledOnce());
  });

  // ── FE-021: "All Done" celebration banner ─────────────────────────────────
  it("shows All Done banner when all tasks in a column are completed", async () => {
    mockFetchTasks.mockResolvedValue([makeTask({ completed: true })]);
    renderBoard();
    await waitFor(() => expect(screen.getByText("All Done!")).toBeInTheDocument());
  });

  it("does not show All Done when there are pending tasks", async () => {
    mockFetchTasks.mockResolvedValue([makeTask({ completed: false })]);
    renderBoard();
    await waitFor(() => screen.getByText("Advisor Tasks"));
    expect(screen.queryByText("All Done!")).not.toBeInTheDocument();
  });

  // ── FE-015: Task completion toggle ───────────────────────────────────────
  it("calls apiToggleTask when checkbox is clicked", async () => {
    mockFetchTasks.mockResolvedValue([makeTask()]);
    mockToggleTask.mockResolvedValue(makeTask({ completed: true }));
    renderBoard();
    await waitFor(() => screen.getByText("Advisor Task 1"));

    const checkbox = screen.getByRole("checkbox");
    await act(async () => { fireEvent.click(checkbox); });

    expect(mockToggleTask).toHaveBeenCalledWith("t1");
  });

  // ── FE-019: Delete task ───────────────────────────────────────────────────
  it("calls apiDeleteTask when delete button is clicked", async () => {
    mockFetchTasks.mockResolvedValue([makeTask()]);
    mockDeleteTask.mockResolvedValue({ ok: true });
    renderBoard();
    await waitFor(() => screen.getByTitle("Delete task"));

    await act(async () => { fireEvent.click(screen.getByTitle("Delete task")); });
    expect(mockDeleteTask).toHaveBeenCalledWith("t1");
  });
});
