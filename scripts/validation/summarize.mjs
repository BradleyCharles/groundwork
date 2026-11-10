#!/usr/bin/env node
// Prints pass counts per scenario from docs/agent-validation.md against the exit criteria.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseResults, summarizeResults } from "./lib.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const rows = summarizeResults(
  parseResults(readFileSync(join(ROOT, "docs", "agent-validation.md"), "utf8")),
);
if (rows.length === 0) console.log("No results recorded yet.");
for (const r of rows) {
  const status =
    r.runs < 3
      ? "in progress"
      : r.meetsCriteria
        ? "meets criteria"
        : "BELOW CRITERIA";
  console.log(
    `${r.scenario.padEnd(4)} ${r.passes}/${r.runs} passed  ${status}`,
  );
}
const required = rows.filter((r) => /^S([1-9]|10)$/.test(r.scenario));
console.log(
  `\nExit criteria (S1 to S10, at least 2 of 3 each): ${required.length === 10 && required.every((r) => r.meetsCriteria) ? "MET" : "not yet met"}`,
);
