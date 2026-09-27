// What a failed sign-in tells the user. Auth.js sends every failure to the sign-in page as
// `?error=<type>`. No imports, so any runtime can use it.

const MESSAGES = new Map([
  ["AccessDenied", "GitHub sign-in was cancelled or access was denied. You can try again."],
  [
    "Configuration",
    "Sign-in isn't available right now because of a server problem. Please try again later.",
  ],
  ["OAuthAccountNotLinked", "This GitHub account can't be linked to an existing account."],
]);

const GENERIC = "Sign-in failed. Please try again.";

/** The message for an Auth.js error type; null when there was no error. */
export function signInErrorMessage(code: string | undefined): string | null {
  if (code === undefined) {
    return null;
  }
  return MESSAGES.get(code) ?? GENERIC;
}
