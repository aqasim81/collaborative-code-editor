import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ErrorPage from "@/app/error";
import GlobalError from "@/app/global-error";

vi.mock("@/app/globals.css", () => ({}));

describe("ErrorPage", () => {
  it("offers to try again and shows the reference for the server log", () => {
    const reset = vi.fn();
    render(
      <ErrorPage error={Object.assign(new Error("boom"), { digest: "abc123" })} reset={reset} />,
    );

    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByText("Reference: abc123")).toBeInTheDocument();
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it("omits the reference when there is none", () => {
    render(<ErrorPage error={new Error("boom")} reset={vi.fn()} />);

    expect(screen.queryByText(/Reference:/)).not.toBeInTheDocument();
  });
});

describe("GlobalError", () => {
  it("renders its own document with a way to try again", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const reset = vi.fn();
    render(
      <GlobalError error={Object.assign(new Error("boom"), { digest: "d1" })} reset={reset} />,
    );

    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByText("Reference: d1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });
});
