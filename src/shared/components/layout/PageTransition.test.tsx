import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import PageTransition from "./PageTransition";

describe("PageTransition", () => {
  it("renders children without crashing", () => {
    render(
      <PageTransition>
        <span data-testid="inner">hello</span>
      </PageTransition>,
    );
    expect(document.querySelector("[data-testid='inner']")).toBeTruthy();
  });
});
