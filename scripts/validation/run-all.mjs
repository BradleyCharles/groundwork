#!/usr/bin/env node
// Runs the validation commands for many scenarios at once and logs each command's output.
//   node scripts/validation/run-all.mjs prepare [--scenarios S1,S2] [--runs 1-3] [--force] [--no-install]
//   node scripts/validation/run-all.mjs check   [--scenarios S1,S2] [--runs 1-3]
// Logs go to .validation/logs/ (override with --log-dir). `check` never records a verdict:
// recording needs a human judgment, so use check-run.mjs --record for that.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENARIOS, SCENARIO_IDS } from "./scenarios.mjs";
import { expandRuns, fileTimestamp } from "./lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const SANDBOXES = join(ROOT, ".validation");

const argv = process.argv.slice(2);
const mode = argv[0];
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1];
};
const flag = (name) => argv.includes(name);

if (!["prepare", "check"].includes(mode)) {
  console.error(
    "Usage:\n  run-all.mjs prepare [--scenarios S1,S2] [--runs 1-3] [--force] [--no-install] [--log-dir DIR]\n  run-all.mjs check   [--scenarios S1,S2] [--runs 1-3] [--log-dir DIR]\n\nDefaults: scenarios S1 to S10 (S11 only if named), runs 1.",
  );
  process.exit(2);
}

const defaultScenarios = SCENARIO_IDS.filter((id) => !SCENARIOS[id].optional);
const scenarios = opt("--scenarios")
  ? opt("--scenarios")
      .split(",")
      .map((s) => s.trim().toUpperCase())
  : defaultScenarios;
const unknown = scenarios.filter((s) => !SCENARIOS[s]);
if (unknown.length) {
  console.error(
    `Unknown scenario(s): ${unknown.join(", ")}. Known: ${SCENARIO_IDS.join(", ")}`,
  );
  process.exit(2);
}
let runs;
try {
  runs = expandRuns(opt("--runs", "1"));
} catch (e) {
  console.error(e.message);
  process.exit(2);
}

const logDir = resolve(opt("--log-dir", join(SANDBOXES, "logs")));
mkdirSync(logDir, { recursive: true });
const stamp = fileTimestamp();

function runScript(script, args, label) {
  const r = spawnSync(process.execPath, [join(HERE, script), ...args], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const log = join(logDir, `${stamp}-${mode}-${label}.log`);
  writeFileSync(
    log,
    `$ node scripts/validation/${script} ${args.join(" ")}\nexit: ${r.status}\n\n--- stdout ---\n${r.stdout}\n--- stderr ---\n${r.stderr}`,
  );
  return { ...r, log };
}

const rows = [];
for (const id of scenarios) {
  for (const run of runs) {
    const label = `${id}-run${run}`;
    if (mode === "prepare") {
      const sandbox = join(SANDBOXES, label);
      if (existsSync(sandbox) && !flag("--force")) {
        rows.push({
          label,
          status: "skipped",
          detail: "already exists (use --force to rebuild)",
        });
        continue;
      }
      const args = [
        id,
        String(run),
        ...(flag("--force") ? ["--force"] : []),
        ...(flag("--no-install") ? ["--no-install"] : []),
      ];
      const r = runScript("prepare-run.mjs", args, label);
      rows.push({
        label,
        status: r.status === 0 ? "ready" : "ERROR",
        detail: r.log,
      });
    } else {
      if (!existsSync(join(SANDBOXES, `${label}.meta.json`))) {
        rows.push({ label, status: "no sandbox", detail: "" });
        continue;
      }
      const r = runScript("check-run.mjs", [id, String(run)], label);
      const automated =
        /^Automated: (.*)$/m.exec(r.stdout)?.[1] ?? "(no result)";
      // Without a transcript no session ran, and many checks pass trivially on an untouched sandbox.
      const ranSession = !/^Transcript: not found/m.test(r.stdout);
      // A failing check on a sandbox nobody has used yet is expected, not a failure.
      const status =
        r.status !== 0 && r.status !== 1
          ? "ERROR"
          : !ranSession
            ? "no session"
            : r.status === 1
              ? "FAILING"
              : "ok";
      rows.push({ label, status, detail: `${automated}  ${r.log}` });
    }
  }
}

const width = Math.max(...rows.map((r) => r.label.length));
console.log(`\n${mode} results (logs in ${logDir}):\n`);
for (const r of rows)
  console.log(`  ${r.label.padEnd(width)}  ${r.status.padEnd(10)} ${r.detail}`);

if (mode === "prepare") {
  const ready = rows.filter((r) => r.status === "ready");
  if (ready.length) {
    const lines = ready.map((r) => {
      const [id, run] = r.label.split("-run");
      return `\n${r.label}\n  cd "${join(SANDBOXES, r.label)}" && claude\n  prompt: ${SCENARIOS[id].prompt}\n  then:   node scripts/validation/check-run.mjs ${id} ${run} --record pass --notes "<what you saw>"   (or --record fail)`;
    });
    const sessions = join(logDir, `${stamp}-sessions.txt`);
    writeFileSync(
      sessions,
      `Sessions to run (use manual permission mode; run each from its own terminal outside any sandbox):\n${lines.join("\n")}\n`,
    );
    console.log(`\nSession checklist with prompts: ${sessions}`);
  }
}
process.exit(rows.some((r) => r.status === "ERROR") ? 1 : 0);
