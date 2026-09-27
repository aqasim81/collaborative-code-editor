// Route constants with no imports, safe to use from any runtime (client, server, edge).

export const SIGN_IN_PATH = "/sign-in";
export const DASHBOARD_PATH = "/dashboard";
export const DEFAULT_REDIRECT_PATH = DASHBOARD_PATH;

export function roomPath(roomId: string): string {
  return `/room/${roomId}`;
}

/** The sign-in page, sending the user back to `callbackPath` afterwards. */
export function signInRedirect(callbackPath: string): string {
  return `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(callbackPath)}`;
}
