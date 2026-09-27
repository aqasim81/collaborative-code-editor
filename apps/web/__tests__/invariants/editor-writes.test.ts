import { describe, expect, it } from "vitest";
import { readAppSourceFiles } from "../helpers/source-files";

// Invariant 3 (#8): edits flow editor → Y.Doc → provider, and the y-codemirror binding (`yCollab`) is the only
// code that moves text between the two. This scan refuses client code that writes the editor or the Y.Text
// directly: a transaction with `changes` or `selection`, a dispatch of anything but an object literal (a
// prepared transaction), `setState`, `EditorState.create` with a `doc`, a view seeded from anything but
// `<text>.toString()`, and Y.Text mutation (`insert`, `applyDelta`, two-argument `delete`) outside `lib/yjs/`.
// It is a heuristic that guards the convention: a write through an aliased method or a computed key escapes it.
const SCANNED_DIRS = ["components/", "lib/"];
const YJS_DIR = "lib/yjs/";

const CALL =
  /\bdispatch\(|\.setState\(|\bEditorState\.create\(|\bnew EditorView\(|\.insert\(|\.applyDelta\(|\.delete\(/g;
const TRANSACTION_WRITE_KEY = /[{,]\s*(changes|selection)\s*[:,}]/;
const DOC_KEY = /[{,]\s*doc\s*[:,}]/;
const DOC_VALUE = /[{,]\s*doc\s*:\s*([^,}]+)/;
const SEED_FROM_TEXT = /^\w+\.toString\(\)$/;

const blank = (text: string) => text.replace(/[^\n]/g, " ");

/** Blanks out comments and string contents, keeping every newline so line numbers still match the source. */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(
      /(^|[^:])(\/\/[^\n]*)/g,
      (_, before: string, comment: string) => before + blank(comment),
    )
    .replace(
      /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g,
      (_, quote: string, body: string) => quote + blank(body) + quote,
    );
}

/** The argument text of the call whose `(` is at `open`, up to its matching `)`. */
function callArguments(code: string, open: number): string {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    const char = code[i] ?? "";
    if ("({[".includes(char)) {
      depth++;
    } else if (")}]".includes(char) && --depth === 0) {
      return code.slice(open + 1, i);
    }
  }
  return code.slice(open + 1);
}

/** How many arguments a call's argument text holds: commas outside nested brackets, plus one. */
function argumentCount(args: string): number {
  let depth = 0;
  let count = args.trim() === "" ? 0 : 1;
  for (const [i, char] of [...args].entries()) {
    if ("({[".includes(char)) {
      depth++;
    } else if (")}]".includes(char)) {
      depth--;
    } else if (char === "," && depth === 0 && args.slice(i + 1).trim() !== "") {
      count++;
    }
  }
  return count;
}

/** Why a call writes document text outside the binding, or null when it doesn't. */
function writeReason(file: string, call: string, args: string): string | null {
  const literal = args.trim().startsWith("{");
  const outsideYjs = !file.startsWith(YJS_DIR);
  switch (call) {
    case "dispatch(":
      if (!literal) {
        return "dispatch of a prepared transaction";
      }
      return TRANSACTION_WRITE_KEY.test(args) ? "dispatch with changes or selection" : null;
    case ".setState(":
      return "setState on an editor";
    case "EditorState.create(":
      return DOC_KEY.test(args) ? "EditorState.create with a doc" : null;
    case "new EditorView(": {
      if (!DOC_KEY.test(args)) {
        return null;
      }
      const value = DOC_VALUE.exec(args)?.[1]?.trim() ?? "";
      return SEED_FROM_TEXT.test(value)
        ? null
        : "EditorView seeded from something other than the shared text";
    }
    case ".insert(":
    case ".applyDelta(":
      return outsideYjs ? `Y.Text ${call.slice(1, -1)} outside ${YJS_DIR}` : null;
    case ".delete(":
      return outsideYjs && argumentCount(args) >= 2 ? `Y.Text delete outside ${YJS_DIR}` : null;
    default:
      return null;
  }
}

/** `file:line reason` for each call in `source` that writes document text outside the y-codemirror binding. */
function editorWriteViolations(file: string, source: string): string[] {
  const code = codeOnly(source);
  return [...code.matchAll(CALL)].flatMap((match) => {
    const open = match.index + match[0].length - 1;
    const reason = writeReason(file, match[0], callArguments(code, open));
    const line = code.slice(0, match.index).split("\n").length;
    return reason ? [`${file}:${line} ${reason}`] : [];
  });
}

function scannedFiles(): [string, string][] {
  return readAppSourceFiles().filter(([file]) => SCANNED_DIRS.some((dir) => file.startsWith(dir)));
}

describe("editor writes (Invariant 3, #8)", () => {
  it("never write the editor or the shared text outside the y-codemirror binding", () => {
    const files = scannedFiles();
    const dispatches = files.flatMap(([, source]) => codeOnly(source).match(/\bdispatch\(/g) ?? []);

    // The language switch and the cursor labels dispatch effects today; seeing them proves the scan runs.
    expect(dispatches.length).toBeGreaterThanOrEqual(2);
    expect(files.flatMap(([file, source]) => editorWriteViolations(file, source))).toEqual([]);
  });

  it("flags editor writes, single- and multi-line", () => {
    const source = [
      'view.dispatch({ changes: { from: 0, insert: "x" } });',
      "view.dispatch({",
      "  effects: e,",
      "  selection: { anchor: 0 },",
      "});",
      "view.dispatch(view.state.update({ changes }));",
      "view.setState(s);",
      'EditorState.create({ doc: "x" });',
      'new EditorView({ parent, doc: "x" });',
      "new EditorView({ parent, doc });",
    ].join("\n");

    expect(editorWriteViolations("components/editor/fixture.ts", source)).toEqual([
      "components/editor/fixture.ts:1 dispatch with changes or selection",
      "components/editor/fixture.ts:2 dispatch with changes or selection",
      "components/editor/fixture.ts:6 dispatch of a prepared transaction",
      "components/editor/fixture.ts:7 setState on an editor",
      "components/editor/fixture.ts:8 EditorState.create with a doc",
      "components/editor/fixture.ts:9 EditorView seeded from something other than the shared text",
      "components/editor/fixture.ts:10 EditorView seeded from something other than the shared text",
    ]);
  });

  it("flags Y.Text mutation outside lib/yjs/", () => {
    const source = ['text.insert(0, "x");', "text.delete(0, 1);", "text.applyDelta([]);"].join(
      "\n",
    );

    expect(editorWriteViolations("components/room/fixture.ts", source)).toEqual([
      "components/room/fixture.ts:1 Y.Text insert outside lib/yjs/",
      "components/room/fixture.ts:2 Y.Text delete outside lib/yjs/",
      "components/room/fixture.ts:3 Y.Text applyDelta outside lib/yjs/",
    ]);
    expect(editorWriteViolations("lib/yjs/fixture.ts", source)).toEqual([]);
  });

  it("allows effects-only dispatches, the seed from the shared text, Map/Set deletes and comments", () => {
    const source = [
      "view.dispatch({ effects: labelsChanged.of(null) });",
      "viewRef.current.dispatch({",
      "  effects: compartment.reconfigure(support),",
      "});",
      "const view = new EditorView({",
      "  parent,",
      "  doc: text.toString(),",
      "  extensions: [setup(text)],",
      "});",
      "EditorState.create({ extensions });",
      "moved.delete(clientId);",
      'awareness.states.delete(get(ids, ","));',
      "// view.dispatch({ changes: { from: 0, insert: 'x' } });",
      "/* text.insert(0, 'x'); */",
      'view.dispatch({ effects: note.of("changes: x, selection: y") });',
    ].join("\n");

    expect(editorWriteViolations("components/editor/fixture.ts", source)).toEqual([]);
  });
});
