/**
 * FE-045 — Tests for ClientPulseGrid component
 *
 * Verifies traffic-light status derivation, stat card rendering,
 * "Send Reminder" button visible only on red cards, and empty-sessions guard.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ClientPulseGrid } from "@/components/provider/ClientPulseGrid";

const mockToastSuccess = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast: { success: mockToastSuccess, error: vi.fn() } }));

// ── Helpers ───────────────────────────────────────────────────────────────────
function fakeSession(overrides = {}) {
  return {
    id: "s1",
    createdAt: "2026-01-15T10:00:00Z",
    filename: "audio.webm",
    summary: "summary",
    taskCount: 5,
    completedCount: 5,
    providerId: "prov-1",
    clientEmail: "alice@test.com",
    ...overrides,
  };
}

describe("ClientPulseGrid (FE-045)", () => {
  it("renders nothing when sessions list is empty", () => {
    const { container } = render(<ClientPulseGrid sessions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders one card per unique client email", () => {
    render(
      <ClientPulseGrid
        sessions={[
          fakeSession({ clientEmail: "alice@test.com" }),
          fakeSession({ id: "s2", clientEmail: "bob@test.com" }),
        ]}
      />
    );
    expect(screen.getByText("alice@test.com")).toBeInTheDocument();
    expect(screen.getByText("bob@test.com")).toBeInTheDocument();
    expect(screen.getByText("2 clients")).toBeInTheDocument();
  });

  it("aggregates task counts across multiple sessions for the same client", () => {
    render(
      <ClientPulseGrid
        sessions={[
          fakeSession({ taskCount: 4, completedCount: 2 }),
          fakeSession({ id: "s2", taskCount: 6, completedCount: 4 }),
        ]}
      />
    );
    // Aggregated: 10 total, 6 completed → "6/10"
    expect(screen.getByText(/\/10/)).toBeInTheDocument();
    // Session count should be 2
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
  });

  // ── Traffic-light status derivation ──────────────────────────────────────
  it("shows 'On Track' badge for ≥ 80% completion rate (green)", () => {
    render(
      <ClientPulseGrid
        sessions={[fakeSession({ taskCount: 10, completedCount: 9 })]} // 90%
      />
    );
    expect(screen.getByText("On Track")).toBeInTheDocument();
  });

  it("shows 'Needs Attention' badge for 30–79% completion rate (yellow)", () => {
    render(
      <ClientPulseGrid
        sessions={[fakeSession({ taskCount: 10, completedCount: 5 })]} // 50%
      />
    );
    expect(screen.getByText("Needs Attention")).toBeInTheDocument();
  });

  it("shows 'At Risk' badge for < 30% completion rate (red)", () => {
    render(
      <ClientPulseGrid
        sessions={[fakeSession({ taskCount: 10, completedCount: 2 })]} // 20%
      />
    );
    expect(screen.getByText("At Risk")).toBeInTheDocument();
  });

  it("shows 'At Risk' when client has zero tasks", () => {
    render(
      <ClientPulseGrid
        sessions={[fakeSession({ taskCount: 0, completedCount: 0 })]}
      />
    );
    expect(screen.getByText("At Risk")).toBeInTheDocument();
  });

  // ── Send Reminder button ─────────────────────────────────────────────────
  it("shows 'Send Reminder' button only on red (At Risk) cards", () => {
    render(
      <ClientPulseGrid
        sessions={[
          fakeSession({ id: "green", clientEmail: "green@test.com", taskCount: 10, completedCount: 9 }),
          fakeSession({ id: "red",   clientEmail: "red@test.com",   taskCount: 10, completedCount: 1 }),
        ]}
      />
    );
    const reminders = screen.getAllByRole("button", { name: /send reminder/i });
    expect(reminders.length).toBe(1); // only for the red card
  });

  it("shows a success toast when Send Reminder is clicked", () => {
    render(
      <ClientPulseGrid
        sessions={[fakeSession({ taskCount: 10, completedCount: 1, clientEmail: "at-risk@test.com" })]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /send reminder/i }));
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.stringContaining("at-risk@test.com")
    );
  });

  // ── Completion rate display ───────────────────────────────────────────────
  it("renders the computed completion rate percentage", () => {
    render(
      <ClientPulseGrid
        sessions={[fakeSession({ taskCount: 4, completedCount: 3 })]} // 75%
      />
    );
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("renders 'Client Pulse' section heading", () => {
    render(<ClientPulseGrid sessions={[fakeSession()]} />);
    expect(screen.getByText("Client Pulse")).toBeInTheDocument();
  });
});
