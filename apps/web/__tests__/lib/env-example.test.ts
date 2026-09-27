import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ENV_KEYS } from "@/lib/env";

const example = readFileSync(resolve(__dirname, "../../../../.env.example"), "utf8");
const listed = new Set(example.match(/^[A-Z0-9_]+(?==)/gm));

describe(".env.example", () => {
  it("lists every web app env variable except NODE_ENV", () => {
    const missing = ENV_KEYS.filter((key) => key !== "NODE_ENV" && !listed.has(key));
    expect(missing, `missing from .env.example: ${missing.join(", ")}`).toEqual([]);
  });
});
