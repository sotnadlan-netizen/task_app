import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AccessibilityWidget } from "./AccessibilityWidget";

describe("AccessibilityWidget", () => {
  it("renders at least one button for the FAB trigger", () => {
    render(<AccessibilityWidget />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("renders without crashing", () => {
    const { container } = render(<AccessibilityWidget />);
    expect(container.firstChild).toBeTruthy();
  });
});
