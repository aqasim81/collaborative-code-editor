import ts from "typescript";
import { describe, expect, it } from "vitest";
import { readAppSourceFiles } from "../helpers/source-files";

// Invariant 3 (#8): edits flow editor → Y.Doc → provider, and the y-codemirror binding (`yCollab`) is the only
// code that moves text between the two. This scan refuses client code that writes the editor or the shared
// text directly. On the editor: a dispatch with `changes`, `selection` or a spread, a dispatch of anything but
// an object literal (a prepared transaction), `view.update([...])`, `setState`, `EditorState.create` with a
// `doc` or a non-literal config, `EditorState.fromJSON`, and a view given a `state`, a non-literal config or a
// `doc` other than `text.toString()`. On the Y.Doc, outside `lib/yjs/`: Y.Text `insert`, `insertEmbed`,
// `applyDelta` and two-argument `delete`, and `Y.applyUpdate`. It is a heuristic that guards the convention:
// it reads call text, not types, so a write through an aliased method or a computed key escapes it.
const SCANNED_DIRS = ["app/", "components/", "lib/"];
const YJS_DIR = "lib/yjs/";

// Group 1 is the call's name; an optional-call `?.` and spaces before `(` still match.
const CALL =
  /(\bdispatch|\.setState|\bEditorState\.create|\bEditorState\.fromJSON|\bnew\s+EditorView|\.insert|\.insertEmbed|\.applyDelta|\.delete|\.update|\bY\.applyUpdate(?:V2)?)\s*(?:\?\.\s*)?\(/g;
const DOC_VALUE = /[{,]\s*["']?doc["']?\s*:\s*([^,}]+)/;
const SEED_FROM_TEXT = /^text\.toString\(\)$/;
const SPREAD = /[{,]\s*\.\.\./;

/** Whether an object literal's text has one of `keys` (a regex alternation), named, quoted or shorthand. */
const hasKey = (args: string, keys: string) =>
  new RegExp(`[{,]\\s*["']?(?:${keys})["']?\\s*[:,}]`).test(args);

const LITERAL_KINDS = new Set([
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle,
  ts.SyntaxKind.TemplateTail,
  ts.SyntaxKind.RegularExpressionLiteral,
]);

/**
 * Blanks out comments, JSX text and the contents of strings, templates and regexes, keeping every newline so
 * line numbers still match the source. The TypeScript parser finds them, so an apostrophe in JSX text or a
 * `//` inside a string can't hide the code after it. Quoted property names are kept, so `{ "changes": c }`
 * is still seen.
 */
function codeOnly(file: string, source: string): string {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const chars = source.split("");
  const blankRange = (start: number, end: number) => {
    for (let i = start; i < end; i++) {
      if (chars[i] !== "\n") {
        chars[i] = " ";
      }
    }
  };
  const visit = (node: ts.Node) => {
    if (node.kind === ts.SyntaxKind.JsxText) {
      blankRange(node.pos, node.end);
      return;
    }
    for (const comment of ts.getLeadingCommentRanges(source, node.pos) ?? []) {
      blankRange(comment.pos, comment.end);
    }
    const propertyName = () => ts.isPropertyAssignment(node.parent) && node.parent.name === node;
    if (LITERAL_KINDS.has(node.kind) && !propertyName()) {
      blankRange(node.getStart(sourceFile) + 1, node.end - 1);
    }
    for (const child of node.getChildren(sourceFile)) {
      visit(child);
    }
  };
  visit(sourceFile);
  return chars.join("");
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
    case "dispatch":
      if (!literal) {
        return "dispatch of a prepared transaction";
      }
      if (SPREAD.test(args)) {
        return "dispatch with a spread";
      }
      return hasKey(args, "changes|selection") ? "dispatch with changes or selection" : null;
    case ".update":
      return args.trim().startsWith("[") ? "view.update with transactions" : null;
    case ".setState":
      return "setState on an editor";
    case "EditorState.create":
      if (!literal) {
        return "EditorState.create with a prepared config";
      }
      return hasKey(args, "doc") ? "EditorState.create with a doc" : null;
    case "EditorState.fromJSON":
      return "EditorState.fromJSON";
    case "new EditorView": {
      if (!literal) {
        return "EditorView with a prepared config";
      }
      if (hasKey(args, "state")) {
        return "EditorView given a state";
      }
      if (!hasKey(args, "doc")) {
        return null;
      }
      const value = DOC_VALUE.exec(args)?.[1]?.trim() ?? "";
      return SEED_FROM_TEXT.test(value)
        ? null
        : "EditorView seeded from something other than the shared text";
    }
    case ".insert":
    case ".insertEmbed":
    case ".applyDelta":
      return outsideYjs ? `Y.Text ${call.slice(1)} outside ${YJS_DIR}` : null;
    case ".delete":
      return outsideYjs && argumentCount(args) >= 2 ? `Y.Text delete outside ${YJS_DIR}` : null;
    case "Y.applyUpdate":
    case "Y.applyUpdateV2":
      return outsideYjs ? `${call} outside ${YJS_DIR}` : null;
    default:
      return null;
  }
}

/** `file:line reason` for each call in `code` that writes document text outside the y-codemirror binding. */
function violationsIn(file: string, code: string): string[] {
  return [...code.matchAll(CALL)].flatMap((match) => {
    const call = (match[1] ?? "").replace(/\s+/g, " ");
    const open = match.index + match[0].length - 1;
    const reason = writeReason(file, call, callArguments(code, open));
    const line = code.slice(0, match.index).split("\n").length;
    return reason ? [`${file}:${line} ${reason}`] : [];
  });
}

const editorWriteViolations = (file: string, source: string) =>
  violationsIn(file, codeOnly(file, source));

describe("editor writes (Invariant 3, #8)", () => {
  it("never write the editor or the shared text outside the y-codemirror binding", () => {
    const files = readAppSourceFiles()
      .filter(([file]) => SCANNED_DIRS.some((dir) => file.startsWith(dir)))
      .map(([file, source]): [string, string] => [file, codeOnly(file, source)]);
    const dispatches = files.flatMap(([, code]) => code.match(/\bdispatch\(/g) ?? []);

    // The language switch and the cursor labels dispatch effects today; seeing them proves the scan runs.
    expect(dispatches.length).toBeGreaterThanOrEqual(2);
    expect(files.flatMap(([file, code]) => violationsIn(file, code))).toEqual([]);
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
      "new EditorView({ parent, doc: other.toString() });",
    ].join("\n");

    expect(editorWriteViolations("components/editor/fixture.ts", source)).toEqual([
      "components/editor/fixture.ts:1 dispatch with changes or selection",
      "components/editor/fixture.ts:2 dispatch with changes or selection",
      "components/editor/fixture.ts:6 dispatch of a prepared transaction",
      "components/editor/fixture.ts:7 setState on an editor",
      "components/editor/fixture.ts:8 EditorState.create with a doc",
      "components/editor/fixture.ts:9 EditorView seeded from something other than the shared text",
      "components/editor/fixture.ts:10 EditorView seeded from something other than the shared text",
      "components/editor/fixture.ts:11 EditorView seeded from something other than the shared text",
    ]);
  });

  it("flags other spellings and other ways into the editor state", () => {
    const source = [
      "view.dispatch({ ...spec });",
      "view.dispatch?.({ changes });",
      "view.dispatch ({ changes });",
      'view.dispatch({ "changes": c });',
      "view.update([tr]);",
      "EditorState.create(config);",
      "EditorState.fromJSON(json);",
      "new EditorView({ parent, state: saved });",
      "new EditorView(config);",
    ].join("\n");

    expect(editorWriteViolations("components/editor/fixture.ts", source)).toEqual([
      "components/editor/fixture.ts:1 dispatch with a spread",
      "components/editor/fixture.ts:2 dispatch with changes or selection",
      "components/editor/fixture.ts:3 dispatch with changes or selection",
      "components/editor/fixture.ts:4 dispatch with changes or selection",
      "components/editor/fixture.ts:5 view.update with transactions",
      "components/editor/fixture.ts:6 EditorState.create with a prepared config",
      "components/editor/fixture.ts:7 EditorState.fromJSON",
      "components/editor/fixture.ts:8 EditorView given a state",
      "components/editor/fixture.ts:9 EditorView with a prepared config",
    ]);
  });

  it("flags Y.Text mutation and Y.Doc updates outside lib/yjs/", () => {
    const source = [
      'text.insert(0, "x");',
      "text.delete(0, 1);",
      "text.applyDelta([]);",
      "text.insertEmbed(0, embed);",
      "Y.applyUpdate(doc, update);",
    ].join("\n");

    expect(editorWriteViolations("components/room/fixture.ts", source)).toEqual([
      "components/room/fixture.ts:1 Y.Text insert outside lib/yjs/",
      "components/room/fixture.ts:2 Y.Text delete outside lib/yjs/",
      "components/room/fixture.ts:3 Y.Text applyDelta outside lib/yjs/",
      "components/room/fixture.ts:4 Y.Text insertEmbed outside lib/yjs/",
      "components/room/fixture.ts:5 Y.applyUpdate outside lib/yjs/",
    ]);
    expect(editorWriteViolations("lib/yjs/fixture.ts", source)).toEqual([]);
  });

  it("sees a write after an apostrophe in JSX, a // in a string or a quote in a regex", () => {
    const source = [
      "const note = <p>Don't</p>;",
      'const path = "a//b/*";',
      'const quote = /"/;',
      "view.dispatch({ changes });",
    ].join("\n");

    expect(editorWriteViolations("components/editor/fixture.tsx", source)).toEqual([
      "components/editor/fixture.tsx:4 dispatch with changes or selection",
    ]);
  });

  it("allows effects-only dispatches, the seed from the shared text, Map/Set deletes and comments", () => {
    const source = [
      "view.dispatch({ effects: labelsChanged.of(null) });",
      "viewRef.current.dispatch({",
      "  effects: compartment.reconfigure(support),",
      "});",
      "view.dispatch({ effects: [...pending] });",
      "const view = new EditorView({",
      "  parent,",
      "  doc: text.toString(),",
      "  extensions: [setup(text)],",
      "});",
      "EditorState.create({ extensions });",
      "moved.delete(clientId);",
      'awareness.states.delete(get(ids, ","));',
      "cache.update(key);",
      "// view.dispatch({ changes: { from: 0, insert: 'x' } });",
      "/* text.insert(0, 'x'); */",
      'view.dispatch({ effects: note.of("changes: x, selection: y") });',
    ].join("\n");

    expect(editorWriteViolations("components/editor/fixture.ts", source)).toEqual([]);
  });
});
