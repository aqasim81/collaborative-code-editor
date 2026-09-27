import type { Metadata } from "next";
import { cookies } from "next/headers";
import { signInWithGitHub } from "@/actions/auth";
import { PageShell } from "@/components/layout/page-shell";
import { signInErrorMessage } from "@/lib/auth-errors";

export const metadata: Metadata = {
  title: "Sign in · Collaborative Code Editor",
};

// Auth.js remembers where sign-in was headed in this cookie (prefixed on https). Its own redirect here after
// a failed GitHub callback drops the query, so the retry would otherwise forget the destination. The
// sign-in action still only follows a same-origin path.
const CALLBACK_COOKIES = ["authjs.callback-url", "__Secure-authjs.callback-url"];

async function rememberedCallback(): Promise<string> {
  const jar = await cookies();
  for (const name of CALLBACK_COOKIES) {
    const value = jar.get(name)?.value;
    if (value) {
      return value;
    }
  }
  return "";
}

interface SignInPageProps {
  searchParams: Promise<{ callbackUrl?: string | string[]; error?: string | string[] }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { callbackUrl, error } = await searchParams;
  let callback = typeof callbackUrl === "string" ? callbackUrl : "";
  if (!callback && error !== undefined) {
    callback = await rememberedCallback();
  }
  const errorMessage = signInErrorMessage(typeof error === "string" ? error : undefined);

  return (
    <PageShell className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        Sign in with GitHub to create rooms and edit code together.
      </p>
      {errorMessage ? (
        <p
          role="alert"
          className="w-full rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {errorMessage}
        </p>
      ) : null}
      <form action={signInWithGitHub} className="w-full">
        <input type="hidden" name="callbackUrl" value={callback} />
        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Continue with GitHub
        </button>
      </form>
    </PageShell>
  );
}
