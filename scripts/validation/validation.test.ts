import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs without types
import * as lib from "./lib.mjs";
// @ts-expect-error plain .mjs without types
import { SCENARIOS, SCENARIO_IDS } from "./scenarios.mjs";

const log = readFileSync(
  new URL("../../docs/agent-validation.md", import.meta.url),
  "utf8",
);

describe("scenarios", () => {
  it("defines S1 to S11", () => {
    expect(SCENARIO_IDS).toEqual(
      Array.from({ length: 11 }, (_, i) => `S${i + 1}`),
    );
  });
  it.each(SCENARIO_IDS)(
    "%s is well formed and its prompt appears verbatim in the log",
    (id: string) => {
      const s = SCENARIOS[id];
      expect(s.title.length).toBeGreaterThan(5);
      expect(s.prompt.length).toBeGreaterThan(5);
      expect(s.expected.length).toBeGreaterThan(5);
      expect(typeof s.checks).toBe("function");
      expect(Array.isArray(s.manual)).toBe(true);
      expect(log).toContain(s.prompt.replace(/\|/g, "\\|"));
    },
  );
  it("never leaks the canary or answers into prompts", () => {
    for (const id of SCENARIO_IDS) {
      expect(SCENARIOS[id].prompt).not.toMatch(/CANARY|PELICAN/);
    }
  });
});

describe("transcript helpers", () => {
  const jsonl = [
    JSON.stringify({ type: "user", message: { role: "user", content: "hi" } }),
    "not json",
    JSON.stringify({
      type: "assistant",
      message: {
        role: "assistant",
        content: [
          { type: "text", text: "codeword PELICAN-7" },
          { type: "tool_use", name: "Read", input: { file_path: "a.md" } },
        ],
      },
    }),
  ].join("\n");

  it("parses text and tool uses, skipping bad lines", () => {
    const events = lib.parseTranscript(jsonl);
    expect(events).toHaveLength(2);
    expect(lib.assistantText(events)).toContain("PELICAN-7");
    expect(lib.allToolUses(events)).toEqual([
      { name: "Read", input: { file_path: "a.md" } },
    ]);
  });
  it("encodes project paths the way Claude Code names its project folders", () => {
    expect(lib.encodeProjectPath("/home/u/Documents/GitHub/groundwork")).toBe(
      "-home-u-Documents-GitHub-groundwork",
    );
    expect(lib.encodeProjectPath("C:\\Users\\a.b\\p")).toBe("C--Users-a-b-p");
  });
});

describe("results log", () => {
  const md = `x\n${lib.BEGIN}\n${lib.END}\ny`;
  const row = (scenario: string, run: number, verdict: string, notes = "") => ({
    date: "2026-11-09",
    scenario,
    run,
    version: "2.1.310 (Claude Code)",
    automated: "3/3 ok",
    verdict,
    notes,
  });

  it("appends rows inside the markers and escapes pipes", () => {
    const out = lib.appendResultRow(md, row("S5", 1, "pass", "a | b\nc"));
    expect(out.startsWith("x\n")).toBe(true);
    expect(out.endsWith(`${lib.END}\ny`)).toBe(true);
    const parsed = lib.parseResults(out);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].notes).toBe("a | b c");
    expect(parsed[0].run).toBe(1);
  });
  it("throws without markers", () => {
    expect(() => lib.appendResultRow("none", row("S1", 1, "pass"))).toThrow(
      /markers/,
    );
  });
  it("summarizes per scenario using the latest verdict per run", () => {
    let out = md;
    for (const r of [
      row("S5", 1, "fail"),
      row("S5", 1, "pass"),
      row("S5", 2, "pass"),
      row("S5", 3, "fail"),
      row("S6", 1, "pass"),
    ]) {
      out = lib.appendResultRow(out, r);
    }
    const s = lib.summarizeResults(lib.parseResults(out));
    expect(
      s.find((x: { scenario: string }) => x.scenario === "S5"),
    ).toMatchObject({ runs: 3, passes: 2, meetsCriteria: true });
    expect(
      s.find((x: { scenario: string }) => x.scenario === "S6"),
    ).toMatchObject({ runs: 1, meetsCriteria: false });
  });
  it("the committed log has the markers", () => {
    expect(log).toContain(lib.BEGIN);
    expect(log).toContain(lib.END);
  });
});
