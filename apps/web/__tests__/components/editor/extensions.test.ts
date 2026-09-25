import { describe, expect, it } from "vitest";
import { loadLanguage } from "@/components/editor/extensions";
import { LANGUAGES, type LanguageId } from "@/lib/languages";

// CodeMirror's name for the grammar each selector option loads.
const EXPECTED_GRAMMAR: Record<LanguageId, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  go: "go",
  rust: "rust",
  java: "java",
  c: "cpp",
  css: "css",
  html: "html",
  json: "json",
};

describe("loadLanguage", () => {
  it.each(LANGUAGES.map((language) => language.id))("loads the %s grammar", async (id) => {
    const support = await loadLanguage(id);

    expect(support.language.name).toBe(EXPECTED_GRAMMAR[id]);
  });
});
