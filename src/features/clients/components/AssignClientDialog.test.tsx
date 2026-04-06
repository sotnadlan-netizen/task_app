import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssignClientDialog } from "./AssignClientDialog";

describe("AssignClientDialog", () => {
  it("renders without crashing when closed", () => {
    const { container } = render(
      <AssignClientDialog
        open={false}
        onOpenChange={vi.fn()}
        sessions={[]}
        onAssign={vi.fn()}
        loading={false}
      />,
    );
    // When closed, dialog content is not visible
    expect(container).toBeTruthy();
  });
});
