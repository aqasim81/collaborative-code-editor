import Link from "next/link";
import type { ReactNode } from "react";
import { LANGUAGES, type LanguageId, toLanguageId } from "@/lib/languages";
import { DASHBOARD_PATH } from "@/lib/routes";

interface ToolbarProps {
  roomName: string;
  /** Shown next to the room name, e.g. the connection status. */
  status?: ReactNode;
  language: LanguageId;
  onLanguageChange: (language: LanguageId) => void;
  /** Room actions, e.g. Share, shown before the language picker. */
  actions?: ReactNode;
}

export function Toolbar({ roomName, status, language, onLanguageChange, actions }: ToolbarProps) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-neutral-200 px-4 dark:border-neutral-800">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Link
          href={DASHBOARD_PATH}
          className="shrink-0 text-sm text-neutral-600 hover:underline dark:text-neutral-400"
        >
          ← <span className="sr-only sm:not-sr-only">Rooms</span>
        </Link>
        <h1 className="truncate text-sm font-medium">{roomName}</h1>
        {status}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {actions}
        <label className="flex items-center gap-2 text-sm">
          <span className="sr-only sm:not-sr-only">Language</span>
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
    </div>
  );
}
