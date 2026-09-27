import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));

vi.mock("@/lib/auth", () => ({ auth }));

import HomePage from "@/app/page";

async function renderHome() {
  return render(await HomePage());
}

describe("HomePage", () => {
  beforeEach(() => {
    auth.mockReset();
  });

  it("sends a signed-out visitor to sign in, then to the dashboard", async () => {
    auth.mockResolvedValue(null);
    await renderHome();

    expect(screen.getByRole("link", { name: "Sign in with GitHub" })).toHaveAttribute(
      "href",
      "/sign-in?callbackUrl=%2Fdashboard",
    );
  });

  it("sends a signed-in visitor straight to the dashboard", async () => {
    auth.mockResolvedValue({ user: { id: "u1", name: "Ada", image: null } });
    await renderHome();

    expect(screen.getByRole("link", { name: "Go to your rooms" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.queryByRole("link", { name: "Sign in with GitHub" })).not.toBeInTheDocument();
  });

  it("explains the product: a heading, the three features and how it works", async () => {
    auth.mockResolvedValue(null);
    await renderHome();

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    for (const name of ["Real-time sync", "Cursors and presence", "Persistence"]) {
      expect(screen.getByRole("heading", { level: 3, name })).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { name: "How it works" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "How it works" })).toHaveAttribute(
      "href",
      "#how-it-works",
    );
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("hides the decorative editor preview from assistive technology", async () => {
    auth.mockResolvedValue(null);
    const { container } = await renderHome();

    const preview = container.querySelector("pre")?.closest("[aria-hidden]");
    expect(preview).toHaveAttribute("aria-hidden", "true");
  });
});
