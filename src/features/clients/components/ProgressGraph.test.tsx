import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressGraph } from "./ProgressGraph";

describe("ProgressGraph", () => {
  it("renders completion percentage", () => {
    render(<ProgressGraph totalTasks={10} completedTasks={5} sessionCount={3} />);
    expect(screen.getAllByText(/50%/).length).toBeGreaterThan(0);
  });

  it("shows 0% when no tasks", () => {
    render(<ProgressGraph totalTasks={0} completedTasks={0} sessionCount={0} />);
    expect(screen.getAllByText(/0%/).length).toBeGreaterThan(0);
  });

  it("shows 100% when all tasks complete", () => {
    render(<ProgressGraph totalTasks={4} completedTasks={4} sessionCount={2} />);
    expect(screen.getAllByText(/100%/).length).toBeGreaterThan(0);
  });
});
