import { describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs without types
import * as lib from "../scripts/docs/living-docs-lib.mjs";
// @ts-expect-error plain .mjs without types
import { lintAgentsMd, MAX_BYTES } from "../scripts/docs/check-agents-md.mjs";

const config = {
  rules: [
    {
      when: ["app/api/**"],
      change: "API changed",
      update: ["docs/technical-map/05-api-routes.md"],
      alsoCheck: "Security Constraints",
    },
    {
      when: ["app/**/page.tsx"],
      change: "Route changed",
      update: ["docs/technical-map/02-site-map.md"],
    },
  ],
};

describe("globToRegExp", () => {
  it("handles ** across directories and zero directories", () => {
    expect(lib.globToRegExp("app/**/page.tsx").test("app/page.tsx")).toBe(true);
    expect(lib.globToRegExp("app/**/page.tsx").test("app/a/b/page.tsx")).toBe(true);
    expect(lib.globToRegExp("app/api/**").test("app/api/profile/route.ts")).toBe(true);
  });
  it("keeps * inside one path segment and escapes dots", () => {
    expect(lib.globToRegExp("lib/*.ts").test("lib/a/b.ts")).toBe(false);
    expect(lib.globToRegExp("proxy.ts").test("proxyxts")).toBe(false);
  });
});

describe("findViolations", () => {
  it("flags a changed source with no doc change", () => {
    const v = lib.findViolations(config, ["app/api/profile/route.ts"]);
    expect(v).toHaveLength(1);
    expect(v[0].rule.change).toBe("API changed");
  });
  it("passes when a listed doc changed too", () => {
    expect(
      lib.findViolations(config, ["app/api/x/route.ts", "docs/technical-map/05-api-routes.md"]),
    ).toEqual([]);
  });
  it("ignores unrelated changes and normalizes Windows separators", () => {
    expect(lib.findViolations(config, ["README.md"])).toEqual([]);
    expect(lib.findViolations(config, ["app\\api\\x\\route.ts"])).toHaveLength(1);
  });
});

describe("render", () => {
  it("replaces only the marked block", () => {
    const md = `a\n${lib.BEGIN}\nold\n${lib.END}\nb`;
    const out = lib.replaceBlock(md, lib.renderTable(config));
    expect(out.startsWith("a\n")).toBe(true);
    expect(out.endsWith(`${lib.END}\nb`)).toBe(true);
    expect(out).toContain("API changed");
    expect(out).not.toContain("old");
  });
  it("throws without markers", () => {
    expect(() => lib.replaceBlock("none", "t")).toThrow(/markers/);
  });
});

describe("lintAgentsMd", () => {
  it("flags dates, plan numbers, and history wording", () => {
    expect(lintAgentsMd("Updated 2026-01-02")).toHaveLength(1);
    expect(lintAgentsMd("Done in Phase 3")).toHaveLength(1);
    expect(lintAgentsMd("This was previously X")).toHaveLength(1);
  });
  it("ignores the Next.js managed block", () => {
    const md =
      "<!-- BEGIN:nextjs-agent-rules -->\nupdated 2026-01-02\n<!-- END:nextjs-agent-rules -->";
    expect(lintAgentsMd(md)).toEqual([]);
  });
  it("fails above the size cap", () => {
    expect(lintAgentsMd("x".repeat(MAX_BYTES + 1))).toHaveLength(1);
  });
});
