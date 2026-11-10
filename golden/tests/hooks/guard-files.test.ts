import { describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs without types
import { checkPath, isEnvFile } from "../../.claude/hooks/guard-files.mjs";

const root = process.platform === "win32" ? "C:\\proj" : "/proj";

describe("isEnvFile", () => {
  it.each([
    ".env",
    ".env.local",
    ".env.production",
    "..env.local",
    "app/.env",
    "x/.env.db.local",
    "prod.env",
    "a.env.local",
  ])("treats %s as an env file", (p) => expect(isEnvFile(p)).toBe(true));
  it.each([
    ".env.example",
    "lib/env.ts",
    "tests/env-boundary.test.ts",
    "environment.md",
    "README.md",
  ])("does not treat %s as an env file", (p) => expect(isEnvFile(p)).toBe(false));
});

describe("checkPath", () => {
  it("blocks reading and writing env files, relative or absolute", () => {
    expect(checkPath(".env.local", "Read", root)).toMatch(/\.env/);
    expect(checkPath("sub/.env", "Write", root)).toMatch(/\.env/);
    expect(
      checkPath(
        `${root}/.env.local`.replaceAll("/", process.platform === "win32" ? "\\" : "/"),
        "Edit",
        root,
      ),
    ).toMatch(/\.env/);
  });

  it("allows .env.example and normal source files", () => {
    expect(checkPath(".env.example", "Edit", root)).toBeNull();
    expect(checkPath("lib/env.ts", "Edit", root)).toBeNull();
  });

  it("blocks editing generated schema docs but allows reading them", () => {
    expect(checkPath("supabase/schema.sql", "Edit", root)).toMatch(/generated/);
    expect(checkPath("supabase/policies.sql", "Write", root)).toMatch(/migration/);
    expect(checkPath("supabase\\policies.sql", "Write", root)).toMatch(/migration/);
    expect(checkPath("supabase/schema.sql", "Read", root)).toBeNull();
  });

  it("sees through path tricks", () => {
    expect(checkPath("supabase/migrations/../schema.sql", "Edit", root)).toMatch(/generated/);
    expect(checkPath("./SUPABASE/Schema.sql", "Edit", root)).toMatch(/generated/);
  });

  it("allows migrations and ignores missing paths", () => {
    expect(checkPath("supabase/migrations/0002_x.sql", "Write", root)).toBeNull();
    expect(checkPath(undefined, "Write", root)).toBeNull();
  });
});
