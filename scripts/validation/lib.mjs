// Helpers for the agent-validation harness (Phase 3). Pure functions live here so they can be tested.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

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

/** "1", "1-3", or "1,3" to [1], [1,2,3], [1,3]. */
export function expandRuns(spec) {
  const runs = new Set();
  for (const part of String(spec).split(",")) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part.trim());
    if (!m) throw new Error(`bad run spec "${part}" (use 1, 1-3, or 1,3)`);
    const from = Number(m[1]);
    const to = m[2] ? Number(m[2]) : from;
    if (from < 1 || to < from || to > 20)
      throw new Error(`bad run range "${part}"`);
    for (let n = from; n <= to; n++) runs.add(n);
  }
  return [...runs].sort((a, b) => a - b);
}

/** Filesystem-safe timestamp, for example 2026-11-09T18-30-05. */
export const fileTimestamp = (date = new Date()) =>
  date.toISOString().slice(0, 19).replace(/:/g, "-");

/**
 * Summarizes a `claude -p --output-format stream-json --verbose --include-hook-events` stream.
 * Unknown shapes are skipped, since the format is not a stable interface.
 */
export function summarizeStream(text) {
  const out = {
    finalText: "",
    assistantText: [],
    tools: [],
    hooks: [],
    resultSubtype: null,
    costUsd: null,
    permissionDenials: [],
    sessionId: null,
    turns: 0,
  };
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    if (e.session_id && !out.sessionId) out.sessionId = e.session_id;
    if (e.type === "system" && e.subtype === "hook_response") {
      out.hooks.push({
        event: e.hook_event,
        name: e.hook_name,
        exitCode: e.exit_code ?? null,
        outcome: e.outcome ?? null,
        stdout: String(e.stdout ?? e.output ?? ""),
        stderr: String(e.stderr ?? ""),
      });
    } else if (e.type === "assistant" && Array.isArray(e.message?.content)) {
      out.turns += 1;
      for (const part of e.message.content) {
        if (part?.type === "text" && part.text)
          out.assistantText.push(part.text);
        if (part?.type === "tool_use")
          out.tools.push({ name: part.name, input: part.input ?? {} });
      }
    } else if (e.type === "result") {
      out.resultSubtype = e.subtype ?? null;
      out.finalText = typeof e.result === "string" ? e.result : "";
      out.costUsd = e.total_cost_usd ?? null;
      out.permissionDenials = Array.isArray(e.permission_denials)
        ? e.permission_denials
        : [];
    }
  }
  if (!out.finalText) out.finalText = out.assistantText.at(-1) ?? "";
  return out;
}

/** Hook blocks (exit code 2) from a stream summary. */
export const blockedByHooks = (summary) =>
  summary.hooks.filter((h) => h.exitCode === 2);

/**
 * Transcripts for a sandbox, newest first, counting only sessions started after the sandbox was
 * (re)built. Claude Code keys transcripts by directory, so a --force rebuild would otherwise
 * inherit the old session.
 */
export function sandboxTranscripts(dir, createdAtIso, home = homedir()) {
  const folder = join(home, ".claude", "projects", encodeProjectPath(dir));
  if (!existsSync(folder)) return [];
  const since = createdAtIso ? Date.parse(createdAtIso) : 0;
  return readdirSync(folder)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => ({
      path: join(folder, f),
      mtime: statSync(join(folder, f)).mtimeMs,
    }))
    .filter((f) => f.mtime >= since)
    .sort((a, b) => b.mtime - a.mtime)
    .map((f) => f.path);
}
