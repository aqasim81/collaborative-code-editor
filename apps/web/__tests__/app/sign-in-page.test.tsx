import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookieJar } = vi.hoisted(() => ({ cookieJar: new Map<string, string>() }));

vi.mock("@/actions/auth", () => ({ signInWithGitHub: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name) } : undefined),
  }),
}));

import SignInPage from "@/app/sign-in/page";

async function renderSignIn(params: {
  callbackUrl?: string | string[];
  error?: string | string[];
}) {
  render(await SignInPage({ searchParams: Promise.resolve(params) }));
}

const callbackInput = () => document.querySelector('input[name="callbackUrl"]');

describe("SignInPage", () => {
  beforeEach(() => {
    cookieJar.clear();
  });

  it("offers GitHub sign-in and keeps the callback", async () => {
    await renderSignIn({ callbackUrl: "/room/r1" });

    expect(screen.getByRole("button", { name: "Continue with GitHub" })).toBeInTheDocument();
    expect(document.querySelector('input[name="callbackUrl"]')).toHaveValue("/room/r1");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("explains a failed sign-in above the button to try again", async () => {
    await renderSignIn({ error: "AccessDenied" });

    expect(screen.getByRole("alert")).toHaveTextContent(/cancelled or access was denied/);
    expect(screen.getByRole("button", { name: "Continue with GitHub" })).toBeInTheDocument();
  });

  it("keeps heading where sign-in was going after a failed GitHub callback (#37)", async () => {
    cookieJar.set("authjs.callback-url", "http://localhost:3000/join/tok");
    await renderSignIn({ error: "AccessDenied" });

    expect(callbackInput()).toHaveValue("http://localhost:3000/join/tok");
  });

  it("prefers the callback in the query and ignores the cookie without an error", async () => {
    cookieJar.set("__Secure-authjs.callback-url", "https://site.test/room/r9");
    await renderSignIn({ error: "AccessDenied", callbackUrl: "/room/r1" });
    expect(callbackInput()).toHaveValue("/room/r1");
  });

  it("uses the https cookie name too", async () => {
    cookieJar.set("__Secure-authjs.callback-url", "https://site.test/room/r9");
    await renderSignIn({ error: "AccessDenied" });
    expect(callbackInput()).toHaveValue("https://site.test/room/r9");
  });

  it("does not read the cookie when there is no error", async () => {
    cookieJar.set("authjs.callback-url", "http://localhost:3000/join/tok");
    await renderSignIn({});
    expect(callbackInput()).toHaveValue("");
  });

  it("ignores repeated query parameters", async () => {
    await renderSignIn({ callbackUrl: ["/a", "/b"], error: ["AccessDenied", "x"] });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(document.querySelector('input[name="callbackUrl"]')).toHaveValue("");
  });
});
