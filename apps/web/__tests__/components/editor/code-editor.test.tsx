import { language } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { yUndoManagerKeymap } from "y-codemirror.next";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
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

const presences = new WeakMap<Y.Text, Awareness>();
/** One awareness per shared text, as a room has. */
function presenceOf(text: Y.Text): Awareness {
  const existing = presences.get(text);
  if (existing) {
    return existing;
  }
  const awareness = new Awareness(text.doc as Y.Doc);
  presences.set(text, awareness);
  return awareness;
}

function sharedText(initial = ""): Y.Text {
  const text = new Y.Doc().getText("codemirror");
  text.insert(0, initial);
  return text;
}

describe("CodeEditor", () => {
  it("mounts one CodeMirror view showing the shared text", () => {
    const text = sharedText("const a = 1;");
    render(<CodeEditor language="javascript" text={text} awareness={presenceOf(text)} />);

    const host = screen.getByTestId("code-editor");
    expect(host.querySelectorAll(".cm-editor")).toHaveLength(1);
    expect(viewIn(host).state.doc.toString()).toBe("const a = 1;");
  });

  it("writes local edits to the shared text (Invariant 3)", () => {
    const text = sharedText("ab");
    render(<CodeEditor language="javascript" text={text} awareness={presenceOf(text)} />);
    const view = viewIn(screen.getByTestId("code-editor"));

    view.dispatch({ changes: { from: 1, insert: "X" } });

    expect(text.toString()).toBe("aXb");
  });

  it("shows remote changes to the shared text", () => {
    const text = sharedText("hello");
    render(<CodeEditor language="javascript" text={text} awareness={presenceOf(text)} />);
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
    render(<CodeEditor language="javascript" text={text} awareness={presenceOf(text)} />);
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
    const { rerender } = render(
      <CodeEditor language="javascript" text={text} awareness={presenceOf(text)} />,
    );
    const host = screen.getByTestId("code-editor");
    const view = viewIn(host);

    await waitFor(() => expect(view.state.facet(language)?.name).toBe("javascript"));

    rerender(<CodeEditor language="python" text={text} awareness={presenceOf(text)} />);

    await waitFor(() => expect(view.state.facet(language)?.name).toBe("python"));
    expect(viewIn(host)).toBe(view);
    expect(view.state.doc.toString()).toBe("x = 1");
  });

  it("ignores a grammar that finishes loading after a newer selection", async () => {
    const text = sharedText();
    const { rerender } = render(
      <CodeEditor language="json" text={text} awareness={presenceOf(text)} />,
    );
    rerender(<CodeEditor language="go" text={text} awareness={presenceOf(text)} />);
    const view = viewIn(screen.getByTestId("code-editor"));

    await waitFor(() => expect(view.state.facet(language)?.name).toBe("go"));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(view.state.facet(language)?.name).toBe("go");
  });

  it("draws another user's caret and selection in their colour", () => {
    const text = sharedText("hello world");
    const awareness = presenceOf(text);
    render(<CodeEditor language="javascript" text={text} awareness={awareness} />);
    const host = screen.getByTestId("code-editor");

    const bob = new Awareness(new Y.Doc());
    bob.setLocalState({
      user: { id: "u-bob", name: "Bob", image: null, color: "#4ade80", colorLight: "#4ade8033" },
      cursor: {
        anchor: Y.relativePositionToJSON(Y.createRelativePositionFromTypeIndex(text, 0)),
        head: Y.relativePositionToJSON(Y.createRelativePositionFromTypeIndex(text, 5)),
      },
    });
    act(() => {
      applyAwarenessUpdate(awareness, encodeAwarenessUpdate(bob, [bob.clientID]), "remote");
    });

    const caret = host.querySelector<HTMLElement>(".cm-ySelectionCaret");
    expect(caret?.style.backgroundColor).toBe("rgb(74, 222, 128)");
    expect(host.querySelector<HTMLElement>(".cm-ySelection")?.textContent).toBe("hello");
    expect(host.querySelector(".cm-remoteCursorLabel")).toHaveTextContent("Bob");
    bob.destroy();
  });

  it("destroys the view on unmount", () => {
    const text = sharedText();
    const { unmount } = render(
      <CodeEditor language="css" text={text} awareness={presenceOf(text)} />,
    );
    const view = viewIn(screen.getByTestId("code-editor"));
    const destroy = vi.spyOn(view, "destroy");

    unmount();

    expect(destroy).toHaveBeenCalledOnce();
  });
});
