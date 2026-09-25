import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Toolbar } from "@/components/editor/toolbar";
import { LANGUAGES } from "@/lib/languages";

describe("Toolbar", () => {
  it("shows the room name and every supported language", () => {
    render(<Toolbar roomName="Pairing" language="javascript" onLanguageChange={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Pairing" })).toBeInTheDocument();
    const options = screen.getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(LANGUAGES.map((language) => language.label));
  });

  it("selects the current language", () => {
    render(<Toolbar roomName="Pairing" language="rust" onLanguageChange={vi.fn()} />);

    expect(screen.getByLabelText("Language")).toHaveValue("rust");
  });

  it("reports the chosen language", () => {
    const onLanguageChange = vi.fn();
    render(
      <Toolbar roomName="Pairing" language="javascript" onLanguageChange={onLanguageChange} />,
    );

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "python" } });

    expect(onLanguageChange).toHaveBeenCalledWith("python");
  });
});
