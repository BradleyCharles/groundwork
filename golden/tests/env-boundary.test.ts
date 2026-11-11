import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (["node_modules", ".next", "tests", "supabase"].includes(name)) return [];
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

describe("server-only boundary", () => {
  it("never references server-only env or the admin client from 'use client' files", () => {
    const offenders = files(root).filter((f) => {
      if (!/\.(ts|tsx)$/.test(f)) return false;
      const src = readFileSync(f, "utf8");
      if (!/^\s*["']use client["']/.test(src)) return false;
      // Any env value other than NEXT_PUBLIC_* is server-only, as is the admin client.
      return /process\.env\.(?!NEXT_PUBLIC_)|serverEnv|supabase\/admin/.test(src);
    });
    expect(offenders).toEqual([]);
  });
});
