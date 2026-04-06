/**
 * QA-005 — Unit tests for RecordDialog
 *
 * Tests state transitions and UI behaviour without real browser APIs.
 * navigator.mediaDevices and MediaRecorder are stubbed via vi.stubGlobal.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { RecordDialog } from "@/features/sessions/components/RecordDialog";

// ── Stub MediaRecorder ────────────────────────────────────────────────────────
class FakeMediaRecorder {
  static isTypeSupported = () => true;
  ondataavailable: ((e: { data: { size: number } }) => void) | null = null;
  onstop: (() => void) | null = null;
  start = vi.fn();
  stop  = vi.fn(() => { this.onstop?.(); });
}

// ── Stub AudioContext ────────────────────────────────────────────────────────
class FakeAudioContext {
  state = "running";
  createMediaStreamSource = vi.fn().mockReturnValue({ connect: vi.fn() });
  createAnalyser          = vi.fn().mockReturnValue({
    fftSize: 128,
    frequencyBinCount: 64,
    getByteFrequencyData: vi.fn(),
  });
  close = vi.fn();
}

const fakeStream = {
  getTracks: () => [{ stop: vi.fn() }],
};

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onRecordingComplete: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();

  // @ts-expect-error stub
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  // @ts-expect-error stub
  vi.stubGlobal("AudioContext", FakeAudioContext);

  Object.defineProperty(globalThis, "navigator", {
    value: {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(fakeStream),
      },
    },
    writable: true,
    configurable: true,
  });

  // Stub requestAnimationFrame / cancelAnimationFrame so waveform loop doesn't run
  vi.stubGlobal("requestAnimationFrame", vi.fn().mockReturnValue(0));
  vi.stubGlobal("cancelAnimationFrame",  vi.fn());
});

describe("RecordDialog", () => {
  it("renders in idle phase when open", () => {
    render(<RecordDialog {...defaultProps} />);
    expect(screen.getByText("Record Meeting")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("client@example.com")).toBeInTheDocument();
  });

  it("Start Recording button is disabled when email is empty", () => {
    render(<RecordDialog {...defaultProps} />);
    const btn = screen.getByRole("button", { name: /start recording/i });
    expect(btn).toBeDisabled();
  });

  it("Start Recording button is disabled for an invalid email", () => {
    render(<RecordDialog {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText("client@example.com"), {
      target: { value: "not-an-email" },
    });
    expect(screen.getByRole("button", { name: /start recording/i })).toBeDisabled();
  });

  it("Start Recording button is enabled for a valid email", () => {
    render(<RecordDialog {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText("client@example.com"), {
      target: { value: "valid@example.com" },
    });
    expect(screen.getByRole("button", { name: /start recording/i })).not.toBeDisabled();
  });

  it("transitions to 'recording' phase after successful mic access", async () => {
    render(<RecordDialog {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText("client@example.com"), {
      target: { value: "test@example.com" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /start recording/i }));
    });

    expect(screen.getByRole("button", { name: /stop & analyze/i })).toBeInTheDocument();
  });

  it("shows an error when microphone access is denied", async () => {
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error("Permission denied"));

    render(<RecordDialog {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText("client@example.com"), {
      target: { value: "test@example.com" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /start recording/i }));
    });

    expect(screen.getByText(/microphone access denied/i)).toBeInTheDocument();
  });

  it("resets state when dialog is closed and re-opened", async () => {
    const { rerender } = render(<RecordDialog {...defaultProps} />);

    // Enter email and start recording
    fireEvent.change(screen.getByPlaceholderText("client@example.com"), {
      target: { value: "test@example.com" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /start recording/i }));
    });

    // Close dialog
    rerender(<RecordDialog {...defaultProps} open={false} />);
    // Re-open
    rerender(<RecordDialog {...defaultProps} open={true} />);

    // Should be back to idle with blank email
    expect(screen.getByPlaceholderText("client@example.com")).toHaveValue("");
    expect(screen.getByRole("button", { name: /start recording/i })).toBeDisabled();
  });

  it("calls onClose when Cancel is clicked", () => {
    render(<RecordDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(defaultProps.onClose).toHaveBeenCalledOnce();
  });
});
