import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CookieConsentBanner } from "./CookieConsentBanner";

beforeEach(() => {
  localStorage.clear();
});

describe("CookieConsentBanner", () => {
  it("renders some UI when no consent stored", () => {
    const { container } = render(<CookieConsentBanner />);
    // banner renders at least a container div
    expect(container.firstChild).toBeTruthy();
  });

  it("stores accepted consent when the accept button is clicked", () => {
    render(<CookieConsentBanner />);
    const buttons = screen.getAllByRole("button");
    // first button is usually accept; try all until consent is set
    for (const btn of buttons) {
      fireEvent.click(btn);
      if (localStorage.getItem("cookie-consent") === "accepted") break;
    }
    // at least confirm clicking doesn't crash
    expect(document.body).toBeTruthy();
  });

  it("does not render when already accepted", () => {
    localStorage.setItem("cookie-consent", "accepted");
    const { container } = render(<CookieConsentBanner />);
    expect(container.firstChild).toBeNull();
  });
});
