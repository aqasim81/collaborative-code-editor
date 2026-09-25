import { language } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { CodeEditor } from "@/components/editor/code-editor";

// jsdom has no layout; CodeMirror's measure pass asks ranges for their rectangles.
beforeAll(() => {
  const emptyRects = (): DOMRectList =>
    Object.assign([], { item: () => null }) as unknown as DOMRectList;
  Range.prototype.getClientRects = emptyRects;
  Range.prototype.getBoundingClientRect = () => new DOMRect();
});

function viewIn(container: HTMLElement): EditorView {
  const dom = container.querySelector<HTMLElement>(".cm-editor");
  const view = dom ? EditorView.findFromDOM(dom) : null;
  if (!view) {
    throw new Error("no editor view mounted");
  }
  return view;
}

describe("CodeEditor", () => {
  it("mounts one CodeMirror view with the initial document", () => {
    render(<CodeEditor language="javascript" initialDoc="const a = 1;" />);

    const host = screen.getByTestId("code-editor");
    expect(host.querySelectorAll(".cm-editor")).toHaveLength(1);
    expect(viewIn(host).state.doc.toString()).toBe("const a = 1;");
  });

  it("switches the grammar in place and keeps the text", async () => {
    const { rerender } = render(<CodeEditor language="javascript" initialDoc="x = 1" />);
    const host = screen.getByTestId("code-editor");
    const view = viewIn(host);

    await waitFor(() => expect(view.state.facet(language)?.name).toBe("javascript"));

    rerender(<CodeEditor language="python" initialDoc="x = 1" />);

    await waitFor(() => expect(view.state.facet(language)?.name).toBe("python"));
    expect(viewIn(host)).toBe(view);
    expect(view.state.doc.toString()).toBe("x = 1");
  });

  it("ignores a grammar that finishes loading after a newer selection", async () => {
    const { rerender } = render(<CodeEditor language="json" />);
    rerender(<CodeEditor language="go" />);
    const view = viewIn(screen.getByTestId("code-editor"));

    await waitFor(() => expect(view.state.facet(language)?.name).toBe("go"));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(view.state.facet(language)?.name).toBe("go");
  });

  it("destroys the view on unmount", () => {
    const { unmount } = render(<CodeEditor language="css" />);
    const view = viewIn(screen.getByTestId("code-editor"));
    const destroy = vi.spyOn(view, "destroy");

    unmount();

    expect(destroy).toHaveBeenCalledOnce();
  });
});
