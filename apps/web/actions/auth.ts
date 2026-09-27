"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { env } from "@/lib/env";
import { safeCallbackPath } from "@/lib/redirect";
import { signInErrorPath } from "@/lib/routes";

export async function signInWithGitHub(formData: FormData): Promise<void> {
  const redirectTo = safeCallbackPath(formData.get("callbackUrl"), env.NEXT_PUBLIC_SITE_URL);
  try {
    await signIn("github", { redirectTo });
  } catch (error) {
    // Only Auth.js failures: the redirect to GitHub is itself thrown and must pass through.
    if (error instanceof AuthError) {
      redirect(signInErrorPath(error.type, redirectTo));
    }
    throw error;
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
