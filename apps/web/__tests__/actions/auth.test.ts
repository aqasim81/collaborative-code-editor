import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInMock, signOutMock, redirectMock, AuthError } = vi.hoisted(() => ({
  // Stands in for next-auth's AuthError, whose module can't load under Vitest; `type` names the failure.
  AuthError: class AuthError extends Error {
    constructor(readonly type: string) {
      super(type);
    }
  },
  signInMock: vi.fn(),
  signOutMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

vi.mock("@/lib/auth", () => ({ signIn: signInMock, signOut: signOutMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next-auth", () => ({ AuthError }));

import { signInWithGitHub, signOutAction } from "@/actions/auth";

function formWith(callbackUrl?: string): FormData {
  const form = new FormData();
  if (callbackUrl !== undefined) {
    form.set("callbackUrl", callbackUrl);
  }
  return form;
}

describe("signInWithGitHub", () => {
  beforeEach(() => {
    signInMock.mockReset();
    redirectMock.mockClear();
  });

  it("signs in with GitHub and returns to the requested page", async () => {
    await signInWithGitHub(formWith("http://localhost:3000/room/abc"));

    expect(signInMock).toHaveBeenCalledWith("github", { redirectTo: "/room/abc" });
  });

  it("defaults to the dashboard when no callback is given", async () => {
    await signInWithGitHub(formWith());

    expect(signInMock).toHaveBeenCalledWith("github", { redirectTo: "/dashboard" });
  });

  it("sends an Auth.js failure back to the sign-in page with its type and destination (#37)", async () => {
    signInMock.mockRejectedValue(new AuthError("AccessDenied"));

    await expect(signInWithGitHub(formWith("/join/tok"))).rejects.toThrow(
      "NEXT_REDIRECT /sign-in?error=AccessDenied&callbackUrl=%2Fjoin%2Ftok",
    );
  });

  it("lets anything else through, including the redirect to GitHub (#37)", async () => {
    const redirectToGitHub = new Error("NEXT_REDIRECT https://github.com/login/oauth/authorize");
    signInMock.mockRejectedValue(redirectToGitHub);

    await expect(signInWithGitHub(formWith())).rejects.toBe(redirectToGitHub);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("ignores an off-site callback", async () => {
    await signInWithGitHub(formWith("//evil.example.com"));

    expect(signInMock).toHaveBeenCalledWith("github", { redirectTo: "/dashboard" });
  });
});

describe("signOutAction", () => {
  it("signs out and returns to the home page", async () => {
    await signOutAction();

    expect(signOutMock).toHaveBeenCalledWith({ redirectTo: "/" });
  });
});
