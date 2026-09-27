import { Database, type LucideIcon, MousePointer2, Zap } from "lucide-react";

interface Feature {
  title: string;
  body: string;
  icon: LucideIcon;
}

const FEATURES: readonly Feature[] = [
  {
    title: "Real-time sync",
    body: "Edits travel as Yjs CRDT updates over WebSockets, so two people typing on the same line never conflict.",
    icon: Zap,
  },
  {
    title: "Cursors and presence",
    body: "Everyone's caret and selection in their own colour, with a list of who is in the room right now.",
    icon: MousePointer2,
  },
  {
    title: "Persistence",
    body: "Every acknowledged edit is written to LevelDB before it is shared, so a room survives a server restart.",
    icon: Database,
  },
];

export function FeatureGrid() {
  return (
    <section aria-labelledby="features-heading" className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 id="features-heading" className="text-2xl font-semibold tracking-tight">
          Built for editing together
        </h2>
        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {FEATURES.map(({ title, body, icon: Icon }) => (
            <li key={title} className="rounded-xl border border-border bg-background p-6">
              <Icon aria-hidden="true" className="size-6" />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
