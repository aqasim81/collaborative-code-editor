const STEPS = [
  { title: "Create a room", body: "Name it and pick a language from your dashboard." },
  {
    title: "Share the invite link",
    body: "Only people with the link can join, and you can reset it.",
  },
  { title: "Edit together", body: "Everyone types in the same document and sees each other live." },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 id="how-heading" className="text-2xl font-semibold tracking-tight">
          How it works
        </h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map(({ title, body }, index) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
