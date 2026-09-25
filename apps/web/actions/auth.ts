"use server";

import { signIn, signOut } from "@/lib/auth";
import { env } from "@/lib/env";
import { safeCallbackPath } from "@/lib/redirect";

export async function signInWithGitHub(formData: FormData): Promise<void> {
  const redirectTo = safeCallbackPath(formData.get("callbackUrl"), env.NEXT_PUBLIC_SITE_URL);
  await signIn("github", { redirectTo });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
