import type { SessionUser } from "@collab-editor/shared";
import Image from "next/image";
import Link from "next/link";
import { signOutAction } from "@/actions/auth";

interface NavbarProps {
  user: SessionUser | null;
}

export function Navbar({ user }: NavbarProps) {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <nav
        aria-label="Main"
        className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4"
      >
        <Link href="/" className="font-semibold">
          Collaborative Code Editor
        </Link>
        {user ? (
          <div className="flex items-center gap-3">
            {user.image ? (
              <Image
                src={user.image}
                alt={`${user.name}'s avatar`}
                width={32}
                height={32}
                className="rounded-full"
              />
            ) : null}
            <span className="text-sm">{user.name}</span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/sign-in"
            className="rounded-md bg-neutral-900 px-3 py-1 text-sm text-white dark:bg-white dark:text-neutral-900"
          >
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
