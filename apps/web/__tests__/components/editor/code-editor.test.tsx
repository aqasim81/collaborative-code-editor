import { language } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { yUndoManagerKeymap } from "y-codemirror.next";
import * as Y from "yjs";
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

function sharedText(initial = ""): Y.Text {
  const text = new Y.Doc().getText("codemirror");
  text.insert(0, initial);
  return text;
}

describe("CodeEditor", () => {
  it("mounts one CodeMirror view showing the shared text", () => {
    render(<CodeEditor language="javascript" text={sharedText("const a = 1;")} />);

    const host = screen.getByTestId("code-editor");
    expect(host.querySelectorAll(".cm-editor")).toHaveLength(1);
    expect(viewIn(host).state.doc.toString()).toBe("const a = 1;");
  });

  it("writes local edits to the shared text (Invariant 3)", () => {
    const text = sharedText("ab");
    render(<CodeEditor language="javascript" text={text} />);
    const view = viewIn(screen.getByTestId("code-editor"));

    view.dispatch({ changes: { from: 1, insert: "X" } });

    expect(text.toString()).toBe("aXb");
  });

  it("shows remote changes to the shared text", () => {
    const text = sharedText("hello");
    render(<CodeEditor language="javascript" text={text} />);
    const view = viewIn(screen.getByTestId("code-editor"));

    // A change from another client arrives as an update to the Y.Doc.
    const remote = new Y.Doc();
    Y.applyUpdate(remote, Y.encodeStateAsUpdate(text.doc as Y.Doc));
    remote.getText("codemirror").insert(5, " world");
    Y.applyUpdate(text.doc as Y.Doc, Y.encodeStateAsUpdate(remote));

    expect(view.state.doc.toString()).toBe("hello world");
  });

  it("undoes only this user's own edits", () => {
    const text = sharedText();
    render(<CodeEditor language="javascript" text={text} />);
    const view = viewIn(screen.getByTestId("code-editor"));
    view.dispatch({ changes: { from: 0, insert: "mine" } });
    // Stop the undo manager from merging the next change into the same step.
    text.doc?.transact(() => text.insert(4, " theirs"), "remote");

    const undo = yUndoManagerKeymap.find((binding) => binding.key === "Mod-z")?.run;
    expect(undo?.(view)).toBe(true);

    expect(text.toString()).toBe(" theirs");
    expect(view.state.doc.toString()).toBe(" theirs");
  });

  it("switches the grammar in place and keeps the text", async () => {
    const text = sharedText("x = 1");
    const { rerender } = render(<CodeEditor language="javascript" text={text} />);
    const host = screen.getByTestId("code-editor");
    const view = viewIn(host);

    await waitFor(() => expect(view.state.facet(language)?.name).toBe("javascript"));

    rerender(<CodeEditor language="python" text={text} />);

    await waitFor(() => expect(view.state.facet(language)?.name).toBe("python"));
    expect(viewIn(host)).toBe(view);
    expect(view.state.doc.toString()).toBe("x = 1");
  });

  it("ignores a grammar that finishes loading after a newer selection", async () => {
    const text = sharedText();
    const { rerender } = render(<CodeEditor language="json" text={text} />);
    rerender(<CodeEditor language="go" text={text} />);
    const view = viewIn(screen.getByTestId("code-editor"));

    await waitFor(() => expect(view.state.facet(language)?.name).toBe("go"));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(view.state.facet(language)?.name).toBe("go");
  });

  it("destroys the view on unmount", () => {
    const { unmount } = render(<CodeEditor language="css" text={sharedText()} />);
    const view = viewIn(screen.getByTestId("code-editor"));
    const destroy = vi.spyOn(view, "destroy");

    unmount();

    expect(destroy).toHaveBeenCalledOnce();
  });
});
