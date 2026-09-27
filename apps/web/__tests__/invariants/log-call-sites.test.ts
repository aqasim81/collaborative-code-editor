import { describe, expect, it } from "vitest";
import { readAppSourceFiles } from "../helpers/source-files";

// Invariant 6 (#57): the loggers serialize a request logged as `req` and a response logged as `res`; under
// any other key a raw request, response or socket prints nearly whole (only its listed redact paths are
// hidden). This scan refuses log calls whose object literal has one of the keys below. It is a heuristic
// that guards the convention: a variable passed to the logger, or a key after a nested object, escapes it.
const FORBIDDEN_KEYS = new Set(["request", "response", "socket", "ctx"]);
// Any receiver counts, so child loggers (`const log = logger.child(...)`) are scanned too. The literal is read
// up to its first `}`, so a nested object's opening key (`ctx: { req }`) still counts.
const LOG_CALL = /\b\w+\.(?:trace|debug|info|warn|error|fatal)\(\s*\{([^}]*)/g;

/** `file:line key` for each log call whose object literal has a forbidden key (named or shorthand). */
function forbiddenLogKeys(file: string, source: string): string[] {
  return [...source.matchAll(LOG_CALL)].flatMap((match) => {
    const line = source.slice(0, match.index).split("\n").length;
    return (match[1] ?? "")
      .split(",")
      .map((property) => /^\s*(\w+)\s*(?::|$)/.exec(property)?.[1])
      .filter((key): key is string => key !== undefined && FORBIDDEN_KEYS.has(key))
      .map((key) => `${file}:${line} ${key}`);
  });
}

describe("log call sites (#57)", () => {
  it("never log a raw request, response, socket or context object", () => {
    const files = readAppSourceFiles();

    expect(files.some(([, source]) => source.match(LOG_CALL) !== null)).toBe(true);
    expect(files.flatMap(([file, source]) => forbiddenLogKeys(file, source))).toEqual([]);
  });

  it("flags forbidden keys, named or shorthand, on single- and multi-line calls and child loggers", () => {
    const source = [
      'logger.info({ roomId, request: req }, "a");',
      "logger.warn(",
      "  {",
      "    socket,",
      "    ip: socket.remoteAddress,",
      "  },",
      '  "b",',
      ");",
      'logger.error({ ctx: { req } }, "c");',
      'logger.info({ req, res, err, reason: response.status }, "d");',
      'log.warn({ roomId, socket: ws }, "e");',
    ].join("\n");

    expect(forbiddenLogKeys("fixture.ts", source)).toEqual([
      "fixture.ts:1 request",
      "fixture.ts:2 socket",
      "fixture.ts:9 ctx",
      "fixture.ts:11 socket",
    ]);
  });
});
