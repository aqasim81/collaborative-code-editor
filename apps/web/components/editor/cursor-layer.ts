import { type Extension, type Range, StateEffect } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  type PluginValue,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import type { Awareness } from "y-protocols/awareness";
import * as Y from "yjs";

/** How long a remote caret's name label stays up after the caret last moved. */
export const LABEL_VISIBLE_MS = 3_000;

interface CursorLabelsOptions {
  awareness: Awareness;
  /** The shared text the editor is bound to; remote cursors are Yjs positions in it. */
  text: Y.Text;
  visibleMs?: number;
  now?: () => number;
}

const labelsChanged = StateEffect.define<null>();

class NameLabel extends WidgetType {
  constructor(
    readonly name: string,
    readonly color: string,
    /**
     * Which move of the caret this is: each move gets a new label instead of CodeMirror reusing the old
     * one, which went missing next to y-codemirror.next's caret widget.
     */
    readonly move: number,
    /** On the first line there is no room above the text, so the label hangs below it. */
    readonly below: boolean,
  ) {
    super();
  }

  override eq(other: NameLabel): boolean {
    return (
      other.name === this.name &&
      other.color === this.color &&
      other.move === this.move &&
      other.below === this.below
    );
  }

  toDOM(): HTMLElement {
    // A zero-width anchor at the caret, as tall as the text (a word joiner gives it a line box, as
    // y-codemirror.next does for its caret), with the label floating just above it.
    const anchor = document.createElement("span");
    anchor.className = "cm-remoteCursorAnchor";
    anchor.setAttribute("aria-hidden", "true");
    anchor.textContent = "\u2060";
    const label = document.createElement("span");
    label.className = this.below
      ? "cm-remoteCursorLabel cm-remoteCursorLabelBelow"
      : "cm-remoteCursorLabel";
    label.style.backgroundColor = this.color;
    label.textContent = this.name;
    anchor.append(label);
    return anchor;
  }

  override ignoreEvent(): boolean {
    return true;
  }
}

const labelTheme = EditorView.baseTheme({
  ".cm-remoteCursorAnchor": { position: "relative" },
  ".cm-remoteCursorLabel": {
    position: "absolute",
    bottom: "100%",
    left: "-1px",
    padding: "0 3px",
    borderRadius: "3px 3px 3px 0",
    color: "#111827",
    fontSize: "0.7rem",
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    lineHeight: "1.3",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    userSelect: "none",
    zIndex: "102",
  },
  ".cm-remoteCursorLabel.cm-remoteCursorLabelBelow": {
    bottom: "auto",
    top: "100%",
    borderRadius: "0 3px 3px 3px",
  },
  // y-codemirror.next's own hover label: readable on the light caret colours, same font as ours.
  ".cm-ySelectionInfo": {
    color: "#111827",
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
  },
});

/** A cursor position from another client, or null when it can't be placed (malformed or unknown). */
function resolve(position: unknown, doc: Y.Doc): Y.AbsolutePosition | null {
  try {
    return Y.createAbsolutePositionFromRelativePosition(
      Y.createRelativePositionFromJSON(position),
      doc,
    );
  } catch {
    return null;
  }
}

interface RemoteCursor {
  head: unknown;
  name: string;
  color: string;
}

function remoteCursor(state: unknown): RemoteCursor | null {
  const { cursor, user } = (state ?? {}) as {
    cursor?: { head?: unknown } | null;
    user?: { name?: unknown; color?: unknown };
  };
  if (!cursor?.head || typeof user?.name !== "string" || typeof user.color !== "string") {
    return null;
  }
  return { head: cursor.head, name: user.name, color: user.color };
}

/**
 * Names remote carets while their owners are active: a label in the user's colour appears when a caret
 * moves (or its user joins) and fades after `visibleMs`. y-codemirror.next draws the carets and
 * selections themselves, and still shows a name when a caret is hovered.
 */
export function remoteCursorLabels({
  awareness,
  text,
  visibleMs = LABEL_VISIBLE_MS,
  now = () => Date.now(),
}: CursorLabelsOptions): Extension {
  const plugin = ViewPlugin.fromClass(
    class implements PluginValue {
      decorations: DecorationSet = Decoration.none;
      // Each remote client's cursor, when it last moved, and a key of where to (to tell moves from other
      // changes such as a renamed user).
      private readonly moved = new Map<
        number,
        { cursor: RemoteCursor; key: string; at: number; move: number }
      >();
      private moves = 0;
      private timer: ReturnType<typeof setTimeout> | undefined;

      constructor(private readonly view: EditorView) {
        for (const [clientId, state] of awareness.getStates()) {
          this.track(clientId, state);
        }
        awareness.on("change", this.onChange);
        this.redraw();
      }

      private readonly onChange = ({
        added,
        updated,
        removed,
      }: {
        added: number[];
        updated: number[];
        removed: number[];
      }): void => {
        let changed = false;
        for (const clientId of [...added, ...updated]) {
          changed = this.track(clientId, awareness.getStates().get(clientId)) || changed;
        }
        for (const clientId of removed) {
          changed = this.moved.delete(clientId) || changed;
        }
        // Local cursor changes happen inside an editor update, where dispatching is not allowed.
        if (changed) {
          this.refresh();
        }
      };

      private track(clientId: number, state: unknown): boolean {
        if (clientId === awareness.clientID) {
          return false;
        }
        const cursor = remoteCursor(state);
        if (!cursor) {
          return this.moved.delete(clientId);
        }
        const key = JSON.stringify(cursor.head);
        const previous = this.moved.get(clientId);
        if (previous?.key === key) {
          // Same place; keep the timer but pick up a changed name or colour.
          previous.cursor = cursor;
          return false;
        }
        this.moved.set(clientId, { cursor, key, at: now(), move: ++this.moves });
        return true;
      }

      private refresh(): void {
        this.view.dispatch({ effects: labelsChanged.of(null) });
      }

      /** Wakes up when the next visible label is due to hide. */
      private schedule(): void {
        clearTimeout(this.timer);
        const current = now();
        const due = [...this.moved.values()]
          .map(({ at }) => at + visibleMs - current)
          .filter((wait) => wait > 0);
        if (due.length > 0) {
          this.timer = setTimeout(() => this.refresh(), Math.min(...due));
        }
      }

      private build(): DecorationSet {
        const doc = text.doc;
        if (!doc) {
          return Decoration.none;
        }
        const current = now();
        const length = this.view.state.doc.length;
        const labels: Range<Decoration>[] = [];
        for (const { cursor, at, move } of this.moved.values()) {
          if (current - at >= visibleMs) {
            continue;
          }
          const head = resolve(cursor.head, doc);
          if (head?.type !== text) {
            continue;
          }
          const position = Math.min(head.index, length);
          const below = this.view.state.doc.lineAt(position).number === 1;
          labels.push(
            Decoration.widget({
              widget: new NameLabel(cursor.name, cursor.color, move, below),
              side: 1,
            }).range(position),
          );
        }
        return Decoration.set(labels, true);
      }

      update(update: ViewUpdate): void {
        const ours = update.transactions.some((tr) => tr.effects.some((e) => e.is(labelsChanged)));
        if (ours || update.docChanged) {
          this.redraw();
        }
      }

      private redraw(): void {
        this.decorations = this.build();
        this.schedule();
      }

      destroy(): void {
        clearTimeout(this.timer);
        awareness.off("change", this.onChange);
      }
    },
    { decorations: (value) => value.decorations },
  );
  return [plugin, labelTheme];
}
