import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/actions/auth", () => ({ signOutAction: vi.fn() }));

import { Navbar } from "@/components/layout/navbar";

describe("Navbar", () => {
  it("shows a sign-in link when signed out", () => {
    render(<Navbar user={null} />);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
  });

  it("shows the avatar, name and sign-out button when signed in", () => {
    render(
      <Navbar
        user={{
          id: "u1",
          name: "Ada Lovelace",
          image: "https://avatars.githubusercontent.com/u/1",
        }}
      />,
    );

    expect(screen.getByRole("img", { name: "Ada Lovelace's avatar" })).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("omits the avatar when the user has no image", () => {
    render(<Navbar user={{ id: "u1", name: "Ada Lovelace", image: null }} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });
});
