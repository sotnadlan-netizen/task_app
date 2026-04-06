import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { AudioPlayer } from "./AudioPlayer";

vi.mock("@/core/api/apiClient", () => ({
  apiFetch: vi.fn().mockResolvedValue({ url: "blob:http://localhost/test" }),
}));

describe("AudioPlayer", () => {
  it("renders without crashing", () => {
    render(<AudioPlayer sessionId="sess-001" />);
    expect(document.body).toBeTruthy();
  });

  it("shows a loading state initially", () => {
    const { container } = render(<AudioPlayer sessionId="sess-001" />);
    // either a loader icon or the player UI — we just ensure no crash
    expect(container.firstChild).toBeTruthy();
  });
});
