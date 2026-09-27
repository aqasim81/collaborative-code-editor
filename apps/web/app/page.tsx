import { FeatureGrid } from "@/components/landing/feature-grid";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PageShell } from "@/components/layout/page-shell";
import { auth } from "@/lib/auth";
import { toSessionUser } from "@/lib/auth.config";
import { DASHBOARD_PATH, signInRedirect } from "@/lib/routes";

export default async function HomePage() {
  const user = toSessionUser(await auth());

  const cta = user
    ? { href: DASHBOARD_PATH, label: "Go to your rooms" }
    : { href: signInRedirect(DASHBOARD_PATH), label: "Sign in with GitHub" };

  return (
    <PageShell>
      <Hero ctaHref={cta.href} ctaLabel={cta.label} />
      <FeatureGrid />
      <HowItWorks />
    </PageShell>
  );
}
