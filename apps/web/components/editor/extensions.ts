import type { LanguageSupport } from "@codemirror/language";
import type { LanguageId } from "@/lib/languages";

// Each grammar is a separate dynamic import, so only the languages a user picks are downloaded.
const LOADERS: Record<LanguageId, () => Promise<LanguageSupport>> = {
  javascript: async () => (await import("@codemirror/lang-javascript")).javascript(),
  typescript: async () =>
    (await import("@codemirror/lang-javascript")).javascript({ typescript: true }),
  python: async () => (await import("@codemirror/lang-python")).python(),
  go: async () => (await import("@codemirror/lang-go")).go(),
  rust: async () => (await import("@codemirror/lang-rust")).rust(),
  java: async () => (await import("@codemirror/lang-java")).java(),
  // CodeMirror has no C-only grammar; the C++ grammar highlights C correctly.
  c: async () => (await import("@codemirror/lang-cpp")).cpp(),
  css: async () => (await import("@codemirror/lang-css")).css(),
  html: async () => (await import("@codemirror/lang-html")).html(),
  json: async () => (await import("@codemirror/lang-json")).json(),
};

export function loadLanguage(id: LanguageId): Promise<LanguageSupport> {
  return LOADERS[id]();
}
