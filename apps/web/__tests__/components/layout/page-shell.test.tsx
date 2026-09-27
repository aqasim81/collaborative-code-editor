import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageShell } from "@/components/layout/page-shell";

describe("PageShell", () => {
  it("puts the children in the one main landmark, followed by the footer", () => {
    render(
      <PageShell className="custom">
        <p>Page content</p>
      </PageShell>,
    );

    const main = screen.getByRole("main");
    expect(main).toHaveTextContent("Page content");
    expect(main).toHaveClass("flex-1", "custom");
    const footer = screen.getByRole("contentinfo");
    expect(main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
