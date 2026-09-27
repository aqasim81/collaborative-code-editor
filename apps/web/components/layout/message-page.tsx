import type { ReactNode } from "react";
import { PageShell } from "./page-shell";

interface MessagePageProps {
  title: string;
  children: ReactNode;
  /** The way forward: links or buttons. */
  actions: ReactNode;
}

/** A short full-page message (not found, error) with what to do next. */
export function MessagePage({ title, children, actions }: MessagePageProps) {
  return (
    <PageShell className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="text-muted-foreground">{children}</div>
      <div className="mt-2 flex flex-wrap justify-center gap-3">{actions}</div>
    </PageShell>
  );
}
