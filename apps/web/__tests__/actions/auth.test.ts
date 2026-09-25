import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInMock, signOutMock } = vi.hoisted(() => ({
  signInMock: vi.fn(),
  signOutMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ signIn: signInMock, signOut: signOutMock }));

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
  });

  it("signs in with GitHub and returns to the requested page", async () => {
    await signInWithGitHub(formWith("http://localhost:3000/room/abc"));

    expect(signInMock).toHaveBeenCalledWith("github", { redirectTo: "/room/abc" });
  });

  it("defaults to the dashboard when no callback is given", async () => {
    await signInWithGitHub(formWith());

    expect(signInMock).toHaveBeenCalledWith("github", { redirectTo: "/dashboard" });
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
