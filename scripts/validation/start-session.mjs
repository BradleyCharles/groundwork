#!/usr/bin/env node
// Starts the interactive Claude Code session for one prepared sandbox, with the scenario prompt
// already submitted and manual permission mode forced. When you exit Claude Code it runs the
// automated checks and asks for your verdict.
//   node scripts/validation/start-session.mjs S5 1
// Run it from a terminal that is not inside another sandbox.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { SCENARIOS, SCENARIO_IDS } from "./scenarios.mjs";
import { sandboxTranscripts } from "./lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const argv = process.argv.slice(2);
const [id, runArg] = argv.filter((a) => !a.startsWith("--"));
const scenario = SCENARIOS[id];
const run = Number(runArg);

if (!scenario || !Number.isInteger(run) || run < 1) {
  console.error(
    `Usage: start-session.mjs <${SCENARIO_IDS.join("|")}> <run number> [--allow-reuse]`,
  );
  process.exit(2);
}
if (scenario.optional) {
  console.error(
    `${id} uses a different tool (Codex or Cursor). Follow the manual steps from: node scripts/validation/check-run.mjs ${id} ${run}`,
  );
  process.exit(2);
}

const name = `${id}-run${run}`;
const dir = join(ROOT, ".validation", name);
if (!existsSync(dir)) {
  console.error(
    `No sandbox for ${name}. Run: node scripts/validation/prepare-run.mjs ${id} ${run}`,
  );
  process.exit(2);
}
if (process.cwd().includes(`${join(ROOT, ".validation")}`)) {
  console.error(
    "Run this from outside any sandbox (for example from the groundwork repo root).",
  );
  process.exit(2);
}

const metaFile = join(ROOT, ".validation", `${name}.meta.json`);
const createdAt = existsSync(metaFile)
  ? JSON.parse(readFileSync(metaFile, "utf8")).createdAt
  : null;
const hasTranscript = sandboxTranscripts(dir, createdAt).length > 0;
if (hasTranscript && !argv.includes("--allow-reuse")) {
  console.error(
    `${name} already has a Claude Code session. A second session would mix into the same run. Rebuild it first:\n  node scripts/validation/prepare-run.mjs ${id} ${run} --force\n(or pass --allow-reuse to continue it on purpose).`,
  );
  process.exit(1);
}

if (scenario.needsSupabase)
  console.log(
    "Note: this scenario needs local Supabase running (shared with golden/).",
  );
console.log(
  `\nStarting ${name}: ${scenario.title}\nPrompt: ${scenario.prompt}\n\nExit Claude Code (Ctrl-C twice or /exit) when the agent has finished.\n`,
);

const bin = process.env.CLAUDE_BIN || "claude";
const session = spawnSync(
  bin,
  ["--permission-mode", "manual", scenario.prompt],
  { cwd: dir, stdio: "inherit" },
);
if (session.error) {
  console.error(`Could not start "${bin}": ${session.error.message}`);
  process.exit(1);
}

console.log(`\nSession ended. Running automated checks for ${name}...`);
const check = spawnSync(
  process.execPath,
  [join(HERE, "check-run.mjs"), id, String(run)],
  { cwd: ROOT, stdio: "inherit" },
);

const rl = createInterface({ input: process.stdin, output: process.stdout });
const verdict = (await rl.question("\nVerdict (pass / fail / skip): "))
  .trim()
  .toLowerCase();
if (verdict === "pass" || verdict === "fail") {
  const notes = (
    await rl.question("Notes (what you saw, in your own words): ")
  ).trim();
  rl.close();
  const rec = spawnSync(
    process.execPath,
    [
      join(HERE, "check-run.mjs"),
      id,
      String(run),
      "--record",
      verdict,
      "--notes",
      notes,
    ],
    {
      cwd: ROOT,
      stdio: "inherit",
    },
  );
  process.exit(rec.status ?? 1);
}
rl.close();
console.log(
  `Not recorded. Record later with:\n  node scripts/validation/check-run.mjs ${id} ${run} --record pass --notes "<what you saw>"`,
);
process.exit(check.status === 1 ? 1 : 0);
