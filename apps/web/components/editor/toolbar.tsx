import { LANGUAGES, type LanguageId, toLanguageId } from "@/lib/languages";

interface ToolbarProps {
  roomName: string;
  language: LanguageId;
  onLanguageChange: (language: LanguageId) => void;
}

export function Toolbar({ roomName, language, onLanguageChange }: ToolbarProps) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between gap-4 border-b border-neutral-200 px-4 dark:border-neutral-800">
      <h1 className="truncate text-sm font-medium">{roomName}</h1>
      <label className="flex items-center gap-2 text-sm">
        <span>Language</span>
        <select
          value={language}
          onChange={(event) => onLanguageChange(toLanguageId(event.target.value))}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          {LANGUAGES.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
