import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Footer } from "./footer";

interface PageShellProps {
  children: ReactNode;
  className?: string;
}

/** Content pages: fills the viewport below the navbar and ends in the footer. The room page doesn't use it. */
export function PageShell({ children, className }: PageShellProps) {
  // The navbar is 3.5rem tall plus a 1px bottom border.
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem-1px)] flex-col">
      <main className={cn("flex-1", className)}>{children}</main>
      <Footer />
    </div>
  );
}
