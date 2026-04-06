/**
 * FE-032, FE-033 — Tests for ProviderAnalytics page
 *
 * Verifies KPI stat cards are rendered correctly and that the CSV export
 * button triggers the download flow.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProviderAnalytics from "@/features/analytics/pages/ProviderAnalytics";

// ── Mock @/core/utils/storage ────────────────────────────────────────────────────────
// vi.mock is hoisted so the factory runs before const declarations —
// use vi.hoisted() to make the fn available in time.
const mockFetchAnalytics = vi.hoisted(() => vi.fn());
vi.mock("@/core/utils/storage", () => ({
  apiFetchAnalyticsOverview: (...a: unknown[]) => mockFetchAnalytics(...a),
}));

// ── Mock @/core/api/apiClient (used by downloadCsvExport internally) ───────────────
vi.mock("@/core/api/apiClient", () => ({ apiFetch: vi.fn() }));

// ── Mock supabaseClient (dynamic import inside downloadCsvExport) ─────────────
vi.mock("@/core/api/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "tok" } } }),
    },
  },
}));

// ── Mock global fetch for the CSV download ────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── Mock URL.createObjectURL / revokeObjectURL ────────────────────────────────
vi.stubGlobal("URL", {
  createObjectURL: vi.fn().mockReturnValue("blob:fake"),
  revokeObjectURL: vi.fn(),
});

// ── Mock Layout ───────────────────────────────────────────────────────────────
vi.mock("@/shared/components/layout/Layout", () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// ── Recharts — stub out to avoid ResizeObserver issues in jsdom ──────────────
vi.mock("recharts", () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
function fakeAnalytics(overrides = {}) {
  return {
    totalSessions:  12,
    totalTasks:     45,
    completedTasks: 30,
    completionRate: 67,
    sessionsByMonth: [
      { month: "Jan 2026", count: 4 },
      { month: "Feb 2026", count: 8 },
    ],
    ...overrides,
  };
}

describe("ProviderAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── FE-032: Analytics KPI cards ──────────────────────────────────────────
  it("shows a loading spinner while data is fetching", () => {
    mockFetchAnalytics.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ProviderAnalytics />);
    expect(document.querySelector("svg.animate-spin")).toBeTruthy();
  });

  it("renders KPI stat cards once data loads", async () => {
    mockFetchAnalytics.mockResolvedValue(fakeAnalytics());
    render(<ProviderAnalytics />);

    await waitFor(() => {
      // getByText with exact class to distinguish KPI card value from progress bar
      expect(screen.getByText("12")).toBeInTheDocument(); // totalSessions
      expect(screen.getByText("45")).toBeInTheDocument(); // totalTasks
      expect(screen.getByText("30")).toBeInTheDocument(); // completedTasks
      // 67% appears in both the KPI card AND the progress bar — use getAllByText
      expect(screen.getAllByText("67%").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders KPI labels", async () => {
    mockFetchAnalytics.mockResolvedValue(fakeAnalytics());
    render(<ProviderAnalytics />);

    await waitFor(() => {
      expect(screen.getByText(/total sessions/i)).toBeInTheDocument();
      expect(screen.getByText(/total tasks/i)).toBeInTheDocument();
      expect(screen.getByText(/completed tasks/i)).toBeInTheDocument();
      expect(screen.getByText(/completion rate/i)).toBeInTheDocument();
    });
  });

  it("shows the sessions-by-month bar chart when data exists", async () => {
    mockFetchAnalytics.mockResolvedValue(fakeAnalytics());
    render(<ProviderAnalytics />);

    await waitFor(() => expect(screen.getByTestId("bar-chart")).toBeInTheDocument());
  });

  it("shows 'No session data yet' when sessionsByMonth is empty", async () => {
    mockFetchAnalytics.mockResolvedValue(fakeAnalytics({ sessionsByMonth: [] }));
    render(<ProviderAnalytics />);

    await waitFor(() =>
      expect(screen.getByText(/no session data yet/i)).toBeInTheDocument()
    );
  });

  it("shows the overall completion rate progress bar", async () => {
    mockFetchAnalytics.mockResolvedValue(fakeAnalytics({ completionRate: 75 }));
    render(<ProviderAnalytics />);

    await waitFor(() =>
      expect(screen.getByText("30 of 45 tasks completed across all sessions")).toBeInTheDocument()
    );
  });

  // ── FE-033: CSV export button ────────────────────────────────────────────
  it("renders the Export CSV button", async () => {
    mockFetchAnalytics.mockResolvedValue(fakeAnalytics());
    render(<ProviderAnalytics />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /export csv/i })).toBeInTheDocument()
    );
  });

  it("Export CSV button is disabled while data is loading", () => {
    mockFetchAnalytics.mockReturnValue(new Promise(() => {}));
    render(<ProviderAnalytics />);
    expect(screen.getByRole("button", { name: /export csv/i })).toBeDisabled();
  });

  it("triggers a file download when Export CSV is clicked", async () => {
    mockFetchAnalytics.mockResolvedValue(fakeAnalytics());

    // Stub document.createElement to capture the <a> click.
    // Save the real implementation first to avoid infinite recursion.
    const originalCreateElement = document.createElement.bind(document);
    const fakeAnchor = { href: "", download: "", click: vi.fn() };
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") return fakeAnchor as unknown as HTMLElement;
      return originalCreateElement(tag);
    });

    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["csv"])),
    });

    render(<ProviderAnalytics />);
    await waitFor(() => screen.getByRole("button", { name: /export csv/i }));

    fireEvent.click(screen.getByRole("button", { name: /export csv/i }));
    await waitFor(() => expect(fakeAnchor.click).toHaveBeenCalled());
  });
});
