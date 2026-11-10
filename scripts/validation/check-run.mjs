#!/usr/bin/env node
// Runs the automated checks for one validation run and optionally records the verdict.
//   node scripts/validation/check-run.mjs S5 1
//   node scripts/validation/check-run.mjs S5 1 --record pass --notes "blocked as expected"
import { spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENARIOS, SCENARIO_IDS } from "./scenarios.mjs";
import { appendResultRow, encodeProjectPath, parseTranscript } from "./lib.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOG = join(ROOT, "docs", "agent-validation.md");

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};
const [id, runArg] = argv.filter(
  (a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"),
);
const scenario = SCENARIOS[id];
const run = Number(runArg);
if (!scenario || !Number.isInteger(run) || run < 1) {
  console.error(
    `Usage: check-run.mjs <${SCENARIO_IDS.join("|")}> <run number> [--record pass|fail --notes "..."] [--force]`,
  );
  process.exit(2);
}

const name = `${id}-run${run}`;
const dir = join(ROOT, ".validation", name);
const metaFile = join(ROOT, ".validation", `${name}.meta.json`);
if (!existsSync(dir) || !existsSync(metaFile)) {
  console.error(
    `No sandbox for ${name}. Run: node scripts/validation/prepare-run.mjs ${id} ${run}`,
  );
  process.exit(2);
}
const meta = JSON.parse(readFileSync(metaFile, "utf8"));

function gitRaw(args) {
  return spawnSync("git", args, { cwd: dir, encoding: "utf8" }).stdout;
}
const git = (args) => gitRaw(args).trim();

function findTranscript() {
  const projects = join(homedir(), ".claude", "projects");
  const candidates = [
    encodeProjectPath(dir),
    encodeProjectPath(dir.replace(/\\/g, "/")),
  ];
  for (const c of candidates) {
    const d = join(projects, c);
    if (!existsSync(d)) continue;
    const files = readdirSync(d)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => join(d, f));
    if (files.length)
      return files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  }
  return null;
}

const transcriptFiles = findTranscript();
const transcriptText = transcriptFiles
  ? transcriptFiles.map((f) => readFileSync(f, "utf8")).join("\n")
  : "";
const ctx = {
  dir,
  meta,
  git,
  transcript: transcriptFiles,
  transcriptText,
  events: transcriptFiles ? parseTranscript(transcriptText) : null,
  // Not trimmed: the first status line starts with a space (" M file").
  changed: gitRaw(["status", "--porcelain", "--untracked-files=all"])
    .split("\n")
    .filter((l) => l.length > 3)
    .map((l) =>
      l
        .slice(3)
        .replace(/^.* -> /, "")
        .replace(/^"|"$/g, ""),
    ),
  runHook(script, payload) {
    return spawnSync(
      process.execPath,
      [join(dir, ".claude", "hooks", script)],
      {
        input: JSON.stringify(payload),
        encoding: "utf8",
        env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
      },
    );
  },
};

console.log(`\n${name}: ${scenario.title}`);
console.log(
  `Transcript: ${transcriptFiles ? transcriptFiles[0] : "not found (transcript-based checks will need a manual look)"}`,
);
console.log(
  `Changed files: ${ctx.changed.length ? ctx.changed.join(", ") : "(none)"}\n`,
);

const results = scenario.checks(ctx);
for (const r of results) {
  const mark = r.ok === true ? "PASS" : r.ok === false ? "FAIL" : "????";
  console.log(`  [${mark}] ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
}
const failed = results.filter((r) => r.ok === false).length;
const unknown = results.filter((r) => r.ok === null).length;
const automated = `${results.filter((r) => r.ok === true).length}/${results.length} ok${unknown ? `, ${unknown} unverified` : ""}`;

console.log("\nManual checks:");
for (const m of scenario.manual) console.log(`  [ ] ${m}`);
console.log(`\nAutomated: ${automated}${failed ? "  <-- failures" : ""}`);

const verdict = opt("--record");
if (verdict) {
  if (!["pass", "fail"].includes(verdict)) {
    console.error("--record must be pass or fail");
    process.exit(2);
  }
  if (verdict === "pass" && failed && !argv.includes("--force")) {
    console.error(
      "\nRefusing to record a pass while automated checks fail. Record fail, or use --force with a note explaining why.",
    );
    process.exit(1);
  }
  const version =
    spawnSync("claude", ["--version"], {
      encoding: "utf8",
      shell: process.platform === "win32",
    }).stdout?.trim() || "unknown";
  const md = readFileSync(LOG, "utf8");
  writeFileSync(
    LOG,
    appendResultRow(md, {
      date: new Date().toISOString().slice(0, 10),
      scenario: id,
      run,
      version,
      automated,
      verdict,
      notes: opt("--notes") ?? "",
    }),
  );
  console.log(
    `Recorded ${id} run ${run}: ${verdict} (${version}) in docs/agent-validation.md`,
  );
}
process.exit(failed ? 1 : 0);
