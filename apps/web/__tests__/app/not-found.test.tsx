import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "@/app/not-found";
import RoomNotFound from "@/app/room/[id]/not-found";

describe("NotFound", () => {
  it("says the page is missing and links home and to the dashboard", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Your rooms" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});

describe("RoomNotFound", () => {
  it("reads the same for a missing room and a non-member (Invariant 2)", () => {
    render(<RoomNotFound />);

    expect(screen.getByRole("main")).toHaveTextContent(
      "It doesn't exist or you don't have access. Ask its owner for an invite link.",
    );
    expect(screen.getByRole("link", { name: "Back to your rooms" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});
