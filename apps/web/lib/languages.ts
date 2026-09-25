// Languages the editor can highlight. Import-free so server and client code can both use it.

export const LANGUAGES = [
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "java", label: "Java" },
  { id: "c", label: "C" },
  { id: "css", label: "CSS" },
  { id: "html", label: "HTML" },
  { id: "json", label: "JSON" },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]["id"];

export const DEFAULT_LANGUAGE: LanguageId = "javascript";

export function isLanguageId(value: string): value is LanguageId {
  return LANGUAGES.some((language) => language.id === value);
}

/** Maps a stored room language to a supported one, falling back to the default. */
export function toLanguageId(value: string): LanguageId {
  return isLanguageId(value) ? value : DEFAULT_LANGUAGE;
}
