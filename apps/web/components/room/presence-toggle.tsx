"use client";

import { Users } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** The id of the panel the toggle shows and hides. */
export const PRESENCE_PANEL_ID = "presence-panel";

interface PresenceToggleProps {
  count: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Shows and hides the presence panel below `lg`, where it doesn't fit beside the editor. */
export function PresenceToggle({ count, open, onOpenChange }: PresenceToggleProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onOpenChange]);

  return (
    <Button
      size="sm"
      variant="outline"
      aria-label={`People (${count})`}
      aria-expanded={open}
      aria-controls={PRESENCE_PANEL_ID}
      onClick={() => onOpenChange(!open)}
      className="lg:hidden"
    >
      <Users aria-hidden="true" />
      <span className="hidden sm:inline">People</span>
      <span className="tabular-nums">{count}</span>
    </Button>
  );
}
