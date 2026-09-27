import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EditorPreview } from "./editor-preview";

interface HeroProps {
  /** Where the primary button goes: the dashboard when signed in, sign-in otherwise. */
  ctaHref: string;
  ctaLabel: string;
}

export function Hero({ ctaHref, ctaLabel }: HeroProps) {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Real-time · Conflict-free · Open source
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Write code together, in the same file, at the same time.
        </h1>
        <p className="max-w-prose text-lg text-muted-foreground">
          Every keystroke syncs through a CRDT, so edits merge without conflicts. See who is in the
          room and where their cursor is, and pick up exactly where you left off.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" className="px-4">
            <Link href={ctaHref}>
              {ctaLabel}
              <ArrowRight aria-hidden="true" data-icon="inline-end" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="px-4">
            <a href="#how-it-works">How it works</a>
          </Button>
        </div>
      </div>
      <EditorPreview />
    </section>
  );
}
