/**
 * FE-044 — Tests for TimeCapsule component
 *
 * Verifies that the summary is split into bullet points, empty summary returns null,
 * filename and formatted date are rendered correctly.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimeCapsule } from "@/components/client/TimeCapsule";

describe("TimeCapsule (FE-044)", () => {
  it("renders nothing when summary is empty string", () => {
    const { container } = render(
      <TimeCapsule summary="" createdAt="2026-01-15T10:00:00Z" filename="audio.webm" />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders 'Last Session' header label", () => {
    render(
      <TimeCapsule
        summary="We discussed rates."
        createdAt="2026-01-15T10:00:00Z"
        filename="audio.webm"
      />
    );
    expect(screen.getByText(/last session/i)).toBeInTheDocument();
  });

  it("renders the filename", () => {
    render(
      <TimeCapsule
        summary="We discussed rates."
        createdAt="2026-01-15T10:00:00Z"
        filename="meeting_jan.webm"
      />
    );
    expect(screen.getAllByText("meeting_jan.webm").length).toBeGreaterThanOrEqual(1);
  });

  it("splits multi-sentence summary into bullet points", () => {
    render(
      <TimeCapsule
        summary="First point. Second point. Third point."
        createdAt="2026-01-15T10:00:00Z"
        filename="audio.webm"
      />
    );
    expect(screen.getByText(/First point/)).toBeInTheDocument();
    expect(screen.getByText(/Second point/)).toBeInTheDocument();
    expect(screen.getByText(/Third point/)).toBeInTheDocument();
  });

  it("renders a single-sentence summary as one bullet", () => {
    render(
      <TimeCapsule
        summary="Only one sentence here."
        createdAt="2026-01-15T10:00:00Z"
        filename="audio.webm"
      />
    );
    const bullets = screen.getAllByRole("listitem");
    expect(bullets.length).toBe(1);
  });

  it("appends a period to bullet points that lack one", () => {
    render(
      <TimeCapsule
        summary="Point without period. Point with trailing period."
        createdAt="2026-01-15T10:00:00Z"
        filename="audio.webm"
      />
    );
    const items = screen.getAllByRole("listitem");
    // Both items should end with a period
    items.forEach((li) => {
      expect(li.textContent?.trim().endsWith(".")).toBe(true);
    });
  });

  it("renders a formatted Hebrew-locale date", () => {
    render(
      <TimeCapsule
        summary="Summary."
        createdAt="2026-01-15T10:00:00Z"
        filename="audio.webm"
      />
    );
    // The formatted date should include "2026" at minimum
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });
});
