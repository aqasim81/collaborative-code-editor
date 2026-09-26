import { isValidElement } from "react";
import { env } from "@/lib/env";

// Invariant 6: a Server Component must not hand a server-only value to a Client Component as a prop.
// These helpers find env values in the props a client component received under test.

/** Env entries that must never reach the browser: everything except NEXT_PUBLIC_* and NODE_ENV. */
export function serverOnlyEnvValues(): [string, string][] {
  return Object.entries(env).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === "string" &&
      !entry[0].startsWith("NEXT_PUBLIC_") &&
      entry[0] !== "NODE_ENV",
  );
}

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    out.push(value);
  } else if (isValidElement(value)) {
    collectStrings(value.props, out);
  } else if (value !== null && typeof value === "object") {
    // Arrays too: Object.values returns their items.
    for (const item of Object.values(value)) collectStrings(item, out);
  }
}

/**
 * Names of the server-only values that occur in any string inside `props`: the env values, plus any
 * `extra` [name, value] pairs a test adds (e.g. a secret read from the database).
 */
export function findServerValues(props: unknown, extra: [string, string][] = []): string[] {
  const strings: string[] = [];
  collectStrings(props, strings);
  return [...serverOnlyEnvValues(), ...extra]
    .filter(([, secret]) => strings.some((text) => text.includes(secret)))
    .map(([name]) => name);
}
