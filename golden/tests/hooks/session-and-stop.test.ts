import { describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs without types
import { buildContext, section } from "../../.claude/hooks/session-start.mjs";
// @ts-expect-error plain .mjs without types
import { evaluate, lineCount } from "../../.claude/hooks/stop-check.mjs";

const state = `# SESSION_STATE.md
<!-- comment -->

## Start Here
<!-- hint -->
- Do the thing

## Active Goal
Ship it.

## Blockers
- None.

## Gotchas
- secret detail
`;

describe("session-start", () => {
  it("extracts a section without comments", () => {
    expect(section(state, "Start Here")).toBe("- Do the thing");
    expect(section(state, "Missing")).toBeNull();
  });
  it("injects Start Here, Active Goal and Blockers only", () => {
    const out = buildContext(state);
    expect(out).toContain("Do the thing");
    expect(out).toContain("Ship it.");
    expect(out).toContain("None.");
    expect(out).not.toContain("secret detail");
  });
  it("tells the agent when the file is missing or over the cap", () => {
    expect(buildContext(null)).toMatch(/does not exist/);
    expect(buildContext("## Start Here\nx\n" + "\nline".repeat(200))).toMatch(/cap 150/);
  });
});

const config = {
  rules: [
    {
      when: ["app/api/**"],
      change: "API changed",
      update: ["docs/technical-map/05-api-routes.md"],
      alsoCheck: "Security Constraints",
    },
  ],
};
const long = Array.from({ length: 151 }, (_, i) => `line ${i}`).join("\n");

describe("stop-check", () => {
  it("counts lines ignoring a trailing newline", () => {
    expect(lineCount("a\nb\n")).toBe(2);
    expect(lineCount(long)).toBe(151);
  });
  it("blocks once when SESSION_STATE.md is over the cap", () => {
    const r = evaluate({ stopHookActive: false, stateText: long, files: [], config });
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/151 lines/);
  });
  it("does not block again when the stop hook is already active", () => {
    expect(evaluate({ stopHookActive: true, stateText: long, files: [], config }).code).toBe(0);
  });
  it("allows a state file at exactly the cap", () => {
    const exact = Array.from({ length: 150 }, () => "x").join("\n");
    expect(evaluate({ stopHookActive: false, stateText: exact, files: [], config }).code).toBe(0);
  });
  it("warns, without blocking, when code changed but its doc did not", () => {
    const r = evaluate({
      stopHookActive: false,
      stateText: "short",
      files: ["app/api/profile/route.ts"],
      config,
    });
    expect(r.code).toBe(0);
    const msg = JSON.parse(r.stdout).systemMessage;
    expect(msg).toMatch(/05-api-routes\.md/);
    expect(msg).toMatch(/Security Constraints/);
  });
  it("stays quiet when the doc changed too", () => {
    const r = evaluate({
      stopHookActive: false,
      stateText: "short",
      files: ["app/api/profile/route.ts", "docs/technical-map/05-api-routes.md"],
      config,
    });
    expect(r).toEqual({ code: 0 });
  });
  it("tolerates a missing state file", () => {
    expect(evaluate({ stopHookActive: false, stateText: null, files: [], config }).code).toBe(0);
  });
});
