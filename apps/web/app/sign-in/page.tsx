import type { Metadata } from "next";
import { signInWithGitHub } from "@/actions/auth";

export const metadata: Metadata = {
  title: "Sign in · Collaborative Code Editor",
};

interface SignInPageProps {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { callbackUrl } = await searchParams;
  const callback = typeof callbackUrl === "string" ? callbackUrl : "";

  return (
    <main className="mx-auto flex max-w-sm flex-col items-center gap-6 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        Sign in with GitHub to create rooms and edit code together.
      </p>
      <form action={signInWithGitHub} className="w-full">
        <input type="hidden" name="callbackUrl" value={callback} />
        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Continue with GitHub
        </button>
      </form>
    </main>
  );
}
