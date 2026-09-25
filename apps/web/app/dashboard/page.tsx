import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SIGN_IN_PATH } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Dashboard · Collaborative Code Editor",
};

// Middleware already redirects signed-out visitors; the page checks again so it never
// depends on middleware alone. Room list and creation arrive in Phase 7.
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect(`${SIGN_IN_PATH}?callbackUrl=%2Fdashboard`);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Your rooms</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        Room creation and listing are coming soon.
      </p>
    </main>
  );
}
