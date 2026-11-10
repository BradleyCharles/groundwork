// Helpers for the agent-validation harness (Phase 3). Pure functions live here so they can be tested.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const BEGIN = "<!-- RESULTS:BEGIN -->";
export const END = "<!-- RESULTS:END -->";
export const PASS_THRESHOLD = { passes: 2, runs: 3 };

export const sha256 = (data) => createHash("sha256").update(data).digest("hex");
export const sha256File = (path) => sha256(readFileSync(path));

/** Claude Code stores transcripts under ~/.claude/projects/<cwd with non-alphanumerics replaced by ->. */
export function encodeProjectPath(cwd) {
  return cwd.replace(/[^A-Za-z0-9]/g, "-");
}

/** Best-effort parse of a Claude Code transcript (JSON lines). Unknown shapes are skipped. */
export function parseTranscript(text) {
  const events = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    const role = obj.type ?? obj.message?.role;
    const content = obj.message?.content;
    const texts = [];
    const tools = [];
    if (typeof content === "string") texts.push(content);
    else if (Array.isArray(content)) {
      for (const part of content) {
        if (part?.type === "text" && typeof part.text === "string")
          texts.push(part.text);
        if (part?.type === "tool_use")
          tools.push({ name: part.name, input: part.input ?? {} });
      }
    }
    events.push({ role, texts, tools });
  }
  return events;
}

export const assistantText = (events) =>
  events
    .filter((e) => e.role === "assistant")
    .flatMap((e) => e.texts)
    .join("\n");

export const allToolUses = (events) => events.flatMap((e) => e.tools);

export function appendResultRow(markdown, row) {
  const a = markdown.indexOf(BEGIN);
  const b = markdown.indexOf(END);
  if (a === -1 || b === -1 || b < a)
    throw new Error("agent-validation.md is missing the RESULTS markers");
  const esc = (s) =>
    String(s ?? "")
      .replace(/\|/g, "\\|")
      .replace(/\r?\n/g, " ");
  const line = `| ${esc(row.date)} | ${esc(row.scenario)} | ${esc(row.run)} | ${esc(row.version)} | ${esc(row.automated)} | ${esc(row.verdict)} | ${esc(row.notes)} |`;
  return `${markdown.slice(0, b).trimEnd()}\n${line}\n${markdown.slice(b)}`;
}

export function parseResults(markdown) {
  const a = markdown.indexOf(BEGIN);
  const b = markdown.indexOf(END);
  if (a === -1 || b === -1) return [];
  return markdown
    .slice(a + BEGIN.length, b)
    .split("\n")
    .filter((l) => /^\|\s*\d{4}-\d{2}-\d{2}\s*\|/.test(l))
    .map((l) => {
      const cells = l
        .split(/(?<!\\)\|/)
        .slice(1, -1)
        .map((c) => c.trim().replace(/\\\|/g, "|"));
      const [date, scenario, run, version, automated, verdict, notes] = cells;
      return {
        date,
        scenario,
        run: Number(run),
        version,
        automated,
        verdict,
        notes,
      };
    });
}

/** Latest verdict per (scenario, run), then pass counts per scenario. */
export function summarizeResults(rows) {
  const latest = new Map();
  for (const r of rows) latest.set(`${r.scenario}#${r.run}`, r);
  const byScenario = new Map();
  for (const r of latest.values()) {
    const s = byScenario.get(r.scenario) ?? { runs: 0, passes: 0 };
    s.runs += 1;
    if (r.verdict === "pass") s.passes += 1;
    byScenario.set(r.scenario, s);
  }
  return [...byScenario.entries()]
    .sort(([x], [y]) => Number(x.slice(1)) - Number(y.slice(1)))
    .map(([scenario, s]) => ({
      scenario,
      ...s,
      meetsCriteria:
        s.runs >= PASS_THRESHOLD.runs && s.passes >= PASS_THRESHOLD.passes,
    }));
}
