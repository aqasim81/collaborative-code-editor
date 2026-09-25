import { describe, expect, it } from "vitest";
import { DEFAULT_LANGUAGE, isLanguageId, LANGUAGES, toLanguageId } from "@/lib/languages";

describe("languages", () => {
  it("lists the ten languages from the issue with unique ids", () => {
    const ids = LANGUAGES.map((language) => language.id);

    expect(ids).toEqual([
      "javascript",
      "typescript",
      "python",
      "go",
      "rust",
      "java",
      "c",
      "css",
      "html",
      "json",
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("recognises supported ids only", () => {
    expect(isLanguageId("python")).toBe(true);
    expect(isLanguageId("cobol")).toBe(false);
    expect(isLanguageId("")).toBe(false);
  });

  it("falls back to the default for an unknown stored language", () => {
    expect(toLanguageId("rust")).toBe("rust");
    expect(toLanguageId("cobol")).toBe(DEFAULT_LANGUAGE);
    expect(DEFAULT_LANGUAGE).toBe("javascript");
  });
});
