import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PresenceToggle } from "@/components/room/presence-toggle";

describe("PresenceToggle", () => {
  it("names the panel it controls and how many people are in the room", () => {
    render(<PresenceToggle count={3} open={false} onOpenChange={vi.fn()} />);

    const button = screen.getByRole("button", { name: "People (3)" });
    expect(button).toHaveAttribute("aria-controls", "presence-panel");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveTextContent("3");
    expect(button).toHaveClass("lg:hidden");
  });

  it("asks to open when closed and to close when open", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <PresenceToggle count={1} open={false} onOpenChange={onOpenChange} />,
    );

    fireEvent.click(screen.getByRole("button"));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    rerender(<PresenceToggle count={1} open onOpenChange={onOpenChange} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button"));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("closes on Escape only while open", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <PresenceToggle count={1} open={false} onOpenChange={onOpenChange} />,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalled();

    rerender(<PresenceToggle count={1} open onOpenChange={onOpenChange} />);
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
