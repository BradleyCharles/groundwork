import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs script without types
import { renderGrantLines, resolveConnectionString } from "../scripts/db/generate-living-docs.mjs";

describe("generate-living-docs", () => {
  it("defaults to the local database", () => {
    expect(resolveConnectionString([])).toContain("127.0.0.1:54322");
  });
  it("reads the remote URL from .env.db.local only with --remote", () => {
    const dir = mkdtempSync(join(tmpdir(), "gw-"));
    writeFileSync(join(dir, ".env.db.local"), "DB_URL=postgresql://example.invalid/db\n");
    expect(resolveConnectionString(["--remote"], dir)).toBe("postgresql://example.invalid/db");
    expect(resolveConnectionString([], dir)).toContain("127.0.0.1");
  });
  it("fails clearly when --remote has no file", () => {
    expect(() => resolveConnectionString(["--remote"], mkdtempSync(join(tmpdir(), "gw-")))).toThrow(
      /\.env\.db\.local/,
    );
  });
  it("renders grants in sorted, stable order", () => {
    const lines = renderGrantLines(
      [
        { object: "public.b", grantee: "anon", privileges: ["SELECT"] },
        { object: "public.a", grantee: "PUBLIC", privileges: ["SELECT"] },
      ],
      "table",
    );
    expect(lines).toEqual([
      "grant SELECT on table public.a to PUBLIC;",
      'grant SELECT on table public.b to "anon";',
    ]);
  });
});
