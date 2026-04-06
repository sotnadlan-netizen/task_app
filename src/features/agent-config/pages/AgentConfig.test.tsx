/**
 * FE-028, FE-029, FE-030 — Tests for AgentConfig page
 *
 * Verifies system-prompt loading, unsaved-changes indicator, save/reset controls,
 * and the JSON schema hint card.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AgentConfig from "@/features/agent-config/pages/AgentConfig";

// ── Mock @/core/utils/storage ────────────────────────────────────────────────────────
// vi.mock factories are hoisted — use vi.hoisted() for all cross-factory values
const mockFetchConfig       = vi.hoisted(() => vi.fn());
const mockSaveConfig        = vi.hoisted(() => vi.fn());
const DEFAULT_SYSTEM_PROMPT = vi.hoisted(() => "DEFAULT_PROMPT_SENTINEL");

vi.mock("@/core/utils/storage", () => ({
  apiFetchConfig:        (...a: unknown[]) => mockFetchConfig(...a),
  apiSaveConfig:         (...a: unknown[]) => mockSaveConfig(...a),
  apiFetchCustomPrompt:  vi.fn().mockResolvedValue(""),
  apiSaveCustomPrompt:   vi.fn().mockResolvedValue(undefined),
  DEFAULT_SYSTEM_PROMPT,
}));

// ── Mock @/core/api/apiClient (used by FE-031 version history) ────────────────────
vi.mock("@/core/api/apiClient", () => ({
  apiFetch: vi.fn(),
}));

// ── Mock Layout ───────────────────────────────────────────────────────────────
vi.mock("@/shared/components/layout/Layout", () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("AgentConfig (FE-028 / FE-029 / FE-030)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── FE-028: loading and rendering ────────────────────────────────────────
  it("shows a loading spinner while config is fetching", () => {
    mockFetchConfig.mockReturnValue(new Promise(() => {})); // never resolves
    render(<AgentConfig />);
    expect(document.querySelector("svg.animate-spin")).toBeTruthy();
  });

  it("renders the textarea with the fetched prompt once loaded", async () => {
    mockFetchConfig.mockResolvedValue({ systemPrompt: "You are a mortgage AI." });
    render(<AgentConfig />);

    await waitFor(() =>
      expect(screen.getByRole("textbox")).toHaveValue("You are a mortgage AI.")
    );
  });

  it("falls back to DEFAULT_SYSTEM_PROMPT when fetch fails", async () => {
    mockFetchConfig.mockRejectedValue(new Error("network error"));
    render(<AgentConfig />);

    await waitFor(() =>
      expect(screen.getByRole("textbox")).toHaveValue(DEFAULT_SYSTEM_PROMPT)
    );
  });

  // ── FE-029: unsaved changes + save/reset ──────────────────────────────────
  it("Save button is disabled when there are no unsaved changes", async () => {
    mockFetchConfig.mockResolvedValue({ systemPrompt: "Existing prompt." });
    render(<AgentConfig />);

    await waitFor(() => screen.getByRole("textbox"));
    const saveBtn = screen.getByRole("button", { name: /save configuration/i });
    expect(saveBtn).toBeDisabled();
  });

  it("shows 'Unsaved changes' badge after editing the textarea", async () => {
    mockFetchConfig.mockResolvedValue({ systemPrompt: "Original." });
    render(<AgentConfig />);

    await waitFor(() => screen.getByRole("textbox"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Modified." } });

    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
  });

  it("enables Save button after editing the textarea", async () => {
    mockFetchConfig.mockResolvedValue({ systemPrompt: "Original." });
    render(<AgentConfig />);

    await waitFor(() => screen.getByRole("textbox"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Modified." } });

    const saveBtn = screen.getByRole("button", { name: /save configuration/i });
    expect(saveBtn).not.toBeDisabled();
  });

  it("calls apiSaveConfig with current prompt when Save is clicked", async () => {
    mockFetchConfig.mockResolvedValue({ systemPrompt: "Original." });
    mockSaveConfig.mockResolvedValue({ systemPrompt: "Modified." });
    render(<AgentConfig />);

    await waitFor(() => screen.getByRole("textbox"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Modified." } });
    fireEvent.click(screen.getByRole("button", { name: /save configuration/i }));

    await waitFor(() =>
      expect(mockSaveConfig).toHaveBeenCalledWith({ systemPrompt: "Modified." })
    );
  });

  it("clears dirty state (Save button disabled) after successful save", async () => {
    mockFetchConfig.mockResolvedValue({ systemPrompt: "Original." });
    mockSaveConfig.mockResolvedValue({ systemPrompt: "Modified." });
    render(<AgentConfig />);

    await waitFor(() => screen.getByRole("textbox"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Modified." } });
    fireEvent.click(screen.getByRole("button", { name: /save configuration/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /save configuration/i })).toBeDisabled()
    );
  });

  it("Reset to Default sets textarea to DEFAULT_SYSTEM_PROMPT and marks dirty", async () => {
    mockFetchConfig.mockResolvedValue({ systemPrompt: "Original." });
    render(<AgentConfig />);

    await waitFor(() => screen.getByRole("textbox"));
    fireEvent.click(screen.getByRole("button", { name: /reset to default/i }));

    expect(screen.getByRole("textbox")).toHaveValue(DEFAULT_SYSTEM_PROMPT);
    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
  });

  // ── FE-030: JSON schema hint ──────────────────────────────────────────────
  it("renders the Expected Output Schema section", async () => {
    mockFetchConfig.mockResolvedValue({ systemPrompt: "Prompt." });
    render(<AgentConfig />);

    await waitFor(() => screen.getByRole("textbox"));
    expect(screen.getByText(/expected output schema/i)).toBeInTheDocument();
    // Schema code block contains key fields (may appear in multiple places)
    expect(screen.getAllByText(/summary/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/assignee/).length).toBeGreaterThanOrEqual(1);
  });
});
