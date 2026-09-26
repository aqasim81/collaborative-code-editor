import { EditorView } from "@codemirror/view";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
import * as Y from "yjs";
import { LABEL_VISIBLE_MS, remoteCursorLabels } from "@/components/editor/cursor-layer";
import { collaborativeSetup } from "@/components/editor/setup";

beforeAll(() => {
  const emptyRects = (): DOMRectList =>
    Object.assign([], { item: () => null }) as unknown as DOMRectList;
  Range.prototype.getClientRects = emptyRects;
  Range.prototype.getBoundingClientRect = () => new DOMRect();
});

interface Setup {
  view: EditorView;
  text: Y.Text;
  local: Awareness;
}

const cleanups: Array<() => void> = [];

/** An editor with the label plugin; `full` adds everything the room editor has, carets included. */
function setup(content = "hello world", full = false): Setup {
  const doc = new Y.Doc();
  const text = doc.getText("codemirror");
  text.insert(0, content);
  const local = new Awareness(doc);
  const view = new EditorView({
    parent: document.body,
    doc: content,
    extensions: full
      ? collaborativeSetup(text, local)
      : remoteCursorLabels({ awareness: local, text }),
  });
  cleanups.push(() => {
    view.destroy();
    local.destroy();
  });
  return { view, text, local };
}

/** A remote client whose cursor sits at `index`; call `moveTo` to move it and relay the change. */
function remote(on: Setup, name: string, color: string) {
  const awareness = new Awareness(new Y.Doc());
  cleanups.push(() => awareness.destroy());
  const relay = () =>
    applyAwarenessUpdate(
      on.local,
      encodeAwarenessUpdate(awareness, [awareness.clientID]),
      "remote",
    );
  return {
    moveTo(index: number) {
      const at = Y.relativePositionToJSON(Y.createRelativePositionFromTypeIndex(on.text, index));
      awareness.setLocalState({
        user: { id: `u-${name}`, name, image: null, color, colorLight: `${color}33` },
        cursor: { anchor: at, head: at },
      });
      relay();
    },
    leave() {
      awareness.setLocalState(null);
      relay();
    },
  };
}

const labels = (view: EditorView) =>
  [...view.dom.querySelectorAll<HTMLElement>(".cm-remoteCursorLabel")].map((label) => ({
    name: label.textContent,
    color: label.style.backgroundColor,
  }));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup();
  }
  vi.useRealTimers();
});

describe("remote cursor labels", () => {
  it("names a remote caret in its user's colour, then hides the label once it stops moving", () => {
    const room = setup();
    const bob = remote(room, "Bob", "#4ade80");

    bob.moveTo(5);
    expect(labels(room.view)).toEqual([{ name: "Bob", color: "rgb(74, 222, 128)" }]);

    vi.advanceTimersByTime(LABEL_VISIBLE_MS - 1);
    expect(labels(room.view)).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(labels(room.view)).toEqual([]);

    bob.moveTo(6);
    expect(labels(room.view).map((l) => l.name)).toEqual(["Bob"]);
  });

  it("puts the label at the caret and follows it", () => {
    const room = setup("ab\ncd");
    const bob = remote(room, "Bob", "#4ade80");
    const labelPosition = () => {
      const label = room.view.dom.querySelector(".cm-remoteCursorAnchor");
      return label ? room.view.posAtDOM(label) : null;
    };

    bob.moveTo(4);
    expect(labelPosition()).toBe(4);

    bob.moveTo(1);
    expect(labelPosition()).toBe(1);
  });

  it("keeps the label through every step of a caret walking along a line, next to its caret", () => {
    const room = setup("ab\nhello world", true);
    const bob = remote(room, "Bob", "#4ade80");

    for (const index of [3, 4, 5, 6, 5, 4, 7, 8]) {
      bob.moveTo(index);
      expect(labels(room.view).map((l) => l.name)).toEqual(["Bob"]);
    }
  });

  it("puts the label under the caret on the first line, where there is no room above", () => {
    const room = setup("ab\ncd");
    const bob = remote(room, "Bob", "#4ade80");

    bob.moveTo(1);
    expect(room.view.dom.querySelector(".cm-remoteCursorLabel")).toHaveClass(
      "cm-remoteCursorLabelBelow",
    );

    bob.moveTo(4);
    expect(room.view.dom.querySelector(".cm-remoteCursorLabel")).not.toHaveClass(
      "cm-remoteCursorLabelBelow",
    );
  });

  it("keeps a separate label and timer per user", () => {
    const room = setup();
    const bob = remote(room, "Bob", "#4ade80");
    const cy = remote(room, "Cy", "#f87171");

    bob.moveTo(1);
    vi.advanceTimersByTime(2_000);
    cy.moveTo(8);
    expect(labels(room.view).map((l) => l.name)).toEqual(["Bob", "Cy"]);

    vi.advanceTimersByTime(1_000);
    expect(labels(room.view).map((l) => l.name)).toEqual(["Cy"]);
    vi.advanceTimersByTime(2_000);
    expect(labels(room.view)).toEqual([]);
  });

  it("survives a remote cursor it can't place, and keeps labelling the others (#32)", () => {
    const room = setup();
    const bob = remote(room, "Bob", "#4ade80");
    const broken = new Awareness(new Y.Doc());
    cleanups.push(() => broken.destroy());
    broken.setLocalState({
      user: { id: "u-x", name: "X", image: null, color: "#f87171", colorLight: "#f8717133" },
      cursor: { anchor: {}, head: {} },
    });

    applyAwarenessUpdate(room.local, encodeAwarenessUpdate(broken, [broken.clientID]), "remote");
    bob.moveTo(3);

    expect(labels(room.view).map((l) => l.name)).toEqual(["Bob"]);
  });

  it("drops the label of a user who leaves", () => {
    const room = setup();
    const bob = remote(room, "Bob", "#4ade80");
    bob.moveTo(3);

    bob.leave();

    expect(labels(room.view)).toEqual([]);
  });

  it("never labels this client's own cursor", () => {
    const room = setup();
    const at = Y.relativePositionToJSON(Y.createRelativePositionFromTypeIndex(room.text, 2));
    room.local.setLocalState({
      user: { id: "u-me", name: "Me", image: null, color: "#000", colorLight: "#0003" },
      cursor: { anchor: at, head: at },
    });

    expect(labels(room.view)).toEqual([]);
  });

  it("labels users already in the room when the editor opens", () => {
    const doc = new Y.Doc();
    const text = doc.getText("codemirror");
    text.insert(0, "hi");
    const local = new Awareness(doc);
    const bob = new Awareness(new Y.Doc());
    const at = Y.relativePositionToJSON(Y.createRelativePositionFromTypeIndex(text, 1));
    bob.setLocalState({
      user: { id: "u-bob", name: "Bob", image: null, color: "#4ade80", colorLight: "#4ade8033" },
      cursor: { anchor: at, head: at },
    });
    applyAwarenessUpdate(local, encodeAwarenessUpdate(bob, [bob.clientID]), "remote");

    const view = new EditorView({
      parent: document.body,
      doc: "hi",
      extensions: remoteCursorLabels({ awareness: local, text }),
    });
    cleanups.push(() => {
      view.destroy();
      local.destroy();
      bob.destroy();
    });

    expect(labels(view).map((l) => l.name)).toEqual(["Bob"]);
  });
});
