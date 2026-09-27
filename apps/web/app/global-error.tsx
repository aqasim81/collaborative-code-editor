"use client";

import "./globals.css";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Replaces the root layout when the layout itself fails, so it brings its own <html> and no navbar.
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground">
            The app hit an unexpected error. Trying again usually helps.
          </p>
          {error.digest ? (
            <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
          ) : null}
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            >
              Try again
            </button>
            {/* A full page load: the client router may be what failed. */}
            <a href="/" className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium">
              Home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
