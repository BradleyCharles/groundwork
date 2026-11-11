#!/usr/bin/env node
// Runs scenario repeats unattended with `claude -p` and writes a review packet. It never records a
// verdict: automated checks run, and a person (or a reviewing agent) reads the packet, judges the
// manual checks, and records with check-run.mjs --record. Headless runs differ from interactive ones:
// there are no permission prompts (edits are auto-accepted, other tools must be pre-allowed), so note
// "headless" in the recorded notes.
//   node scripts/validation/run-headless.mjs [--scenarios S1,S5,S7,S8,S10] [--runs 2-3] [--dry-run]
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENARIOS, SCENARIO_IDS } from "./scenarios.mjs";
import {
  expandRuns,
  fileTimestamp,
  parseResults,
  summarizeStream,
  blockedByHooks,
  sandboxTranscripts,
} from "./lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const SANDBOXES = join(ROOT, ".validation");
const argv = process.argv.slice(2);
const opt = (n, d) => (argv.indexOf(n) === -1 ? d : argv[argv.indexOf(n) + 1]);

const DEFAULT = ["S1", "S4", "S5", "S7", "S8", "S9", "S10"];
const scenarios = opt("--scenarios", DEFAULT.join(","))
  .split(",")
  .map((s) => s.trim().toUpperCase());
const bad = scenarios.filter((s) => !SCENARIOS[s] || SCENARIOS[s].optional);
if (bad.length) {
  console.error(
    `Not runnable headless: ${bad.join(", ")}. Known: ${SCENARIO_IDS.filter((s) => !SCENARIOS[s].optional).join(", ")}`,
  );
  process.exit(2);
}
const runs = expandRuns(opt("--runs", "2-3"));
const dry = argv.includes("--dry-run");

const recorded = new Set(
  parseResults(
    readFileSync(join(ROOT, "docs", "agent-validation.md"), "utf8"),
  ).map((r) => `${r.scenario}-run${r.run}`),
);
const hasSession = (dir, label) => {
  const metaFile = join(SANDBOXES, `${label}.meta.json`);
  const createdAt = existsSync(metaFile)
    ? JSON.parse(readFileSync(metaFile, "utf8")).createdAt
    : null;
  return sandboxTranscripts(dir, createdAt).length > 0;
};

const logDir = join(SANDBOXES, "logs");
mkdirSync(logDir, { recursive: true });
const stamp = fileTimestamp();
const packet = [
  `# Headless review packet ${stamp}\n`,
  'Judge each run against its manual checks, then record with `check-run.mjs <S#> <run> --record pass|fail --notes "[headless] ..."`.\n',
];
const rows = [];

for (const id of scenarios) {
  for (const run of runs) {
    const label = `${id}-run${run}`;
    const dir = join(SANDBOXES, label);
    if (recorded.has(label) && !argv.includes("--include-recorded")) {
      rows.push({
        label,
        status: "skipped",
        detail:
          "already recorded (use --include-recorded to rerun after a fix)",
      });
      continue;
    }
    if (existsSync(dir) && hasSession(dir, label)) {
      rows.push({
        label,
        status: "skipped",
        detail:
          "has an unrecorded session already; record it or rebuild with prepare-run.mjs --force",
      });
      continue;
    }
    if (dry) {
      rows.push({ label, status: "would run", detail: "" });
      continue;
    }
    if (!existsSync(dir)) {
      const p = spawnSync(
        process.execPath,
        [join(HERE, "prepare-run.mjs"), id, String(run)],
        { cwd: ROOT, encoding: "utf8" },
      );
      if (p.status !== 0) {
        rows.push({ label, status: "ERROR", detail: "prepare failed" });
        continue;
      }
    }

    const s = SCENARIOS[id];
    console.log(`Running ${label} headless...`);
    const t0 = Date.now();
    const r = spawnSync(
      "claude",
      [
        "-p",
        s.prompt,
        "--permission-mode",
        "acceptEdits",
        ...(s.headlessAllow?.length
          ? ["--allowedTools", s.headlessAllow.join(",")]
          : []),
        "--output-format",
        "stream-json",
        "--verbose",
        "--include-hook-events",
      ],
      {
        cwd: dir,
        encoding: "utf8",
        timeout: 10 * 60 * 1000,
        maxBuffer: 100 * 1024 * 1024,
      },
    );
    const secs = Math.round((Date.now() - t0) / 1000);
    const streamFile = join(logDir, `${stamp}-headless-${label}.stream.jsonl`);
    writeFileSync(streamFile, r.stdout ?? "");
    if (r.error || r.status !== 0) {
      rows.push({
        label,
        status: "ERROR",
        detail: `claude exited ${r.status ?? r.error?.code} after ${secs}s; stderr: ${(r.stderr ?? "").slice(0, 200)}`,
      });
      continue;
    }

    const sum = summarizeStream(r.stdout);
    const chk = spawnSync(
      process.execPath,
      [join(HERE, "check-run.mjs"), id, String(run)],
      { cwd: ROOT, encoding: "utf8" },
    );
    const automated =
      /^Automated: (.*)$/m.exec(chk.stdout)?.[1] ?? "(no result)";
    const blocks = blockedByHooks(sum);
    rows.push({
      label,
      status: chk.status === 0 ? "checks ok" : "CHECKS FAIL",
      detail: `${automated}; ${secs}s; hook blocks: ${blocks.length}; permission denials: ${sum.permissionDenials.length}`,
    });

    const clip = (t, n = 400) =>
      String(t).replace(/\s+/g, " ").trim().slice(0, n);
    packet.push(
      `\n## ${label}: ${s.title}\n`,
      `**Prompt:** ${s.prompt}\n`,
      `**Expected:** ${s.expected}\n`,
      `**Automated:** ${automated}${chk.status === 1 ? " (FAILURES)" : ""}\n`,
      "```",
      chk.stdout
        .trim()
        .split("\n")
        .filter((l) => /\[(PASS|FAIL|\?\?\?\?)\]/.test(l))
        .join("\n"),
      "```",
      `**Final answer:**\n\n> ${clip(sum.finalText, 1200)}\n`,
      `**Tool calls (${sum.tools.length}):** ${sum.tools.map((t) => `${t.name}(${clip(JSON.stringify(t.input), 90)})`).join("; ") || "none"}\n`,
      `**Permission denials (${sum.permissionDenials.length}):** ${sum.permissionDenials.map((d) => `${d.tool_name}(${clip(JSON.stringify(d.tool_input), 90)})`).join("; ") || "none"}\n`,
      `**Hooks fired (${sum.hooks.length}):**\n${
        sum.hooks
          .map(
            (h) =>
              `- ${h.event} ${h.name ?? ""}: exit ${h.exitCode}, ${h.outcome}${h.stderr ? `, stderr: ${clip(h.stderr, 160)}` : ""}${h.stdout && h.event !== "SessionStart" ? `, stdout: ${clip(h.stdout, 160)}` : ""}`,
          )
          .join("\n") || "- none"
      }\n`,
      `**Manual checks:** ${s.manual.join(" | ")}\n`,
      `**Stream:** ${streamFile}\n`,
    );
  }
}

const w = Math.max(...rows.map((x) => x.label.length));
console.log("\nHeadless results:\n");
for (const x of rows)
  console.log(`  ${x.label.padEnd(w)}  ${x.status.padEnd(12)} ${x.detail}`);
if (!dry && rows.some((x) => ["checks ok", "CHECKS FAIL"].includes(x.status))) {
  const file = join(logDir, `${stamp}-headless-review.md`);
  writeFileSync(file, packet.join("\n"));
  console.log(`\nReview packet: ${file}`);
}
process.exit(rows.some((x) => x.status === "ERROR") ? 1 : 0);
