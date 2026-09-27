import { REPO_URL } from "@/lib/routes";

// Rendered on the server only, so the year never differs between server and client markup.
export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} Collaborative Code Editor · Built with Next.js, Yjs and
          CodeMirror
        </p>
        <a href={REPO_URL} className="hover:text-foreground hover:underline">
          Source on GitHub
        </a>
      </div>
    </footer>
  );
}
