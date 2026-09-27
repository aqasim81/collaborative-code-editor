import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "@/components/layout/footer";
import { REPO_URL } from "@/lib/routes";

describe("Footer", () => {
  it("links to the source repository and names the stack", () => {
    render(<Footer />);

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Source on GitHub" })).toHaveAttribute(
      "href",
      REPO_URL,
    );
    expect(screen.getByText(/Built with Next\.js, Yjs and CodeMirror/)).toBeInTheDocument();
  });

  it("shows the current year", () => {
    render(<Footer />);

    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()}`))).toBeInTheDocument();
  });
});
