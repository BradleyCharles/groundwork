#!/usr/bin/env node
// Fails when a rule's source paths changed but none of its docs did.
// Usage: node scripts/docs/check-living-docs.mjs --base origin/main
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findViolations, loadConfig } from "./living-docs-lib.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const base = baseIdx === -1 ? "origin/main" : args[baseIdx + 1];
if (!base || base.startsWith("-")) {
  console.error("--base needs a ref");
  process.exit(2);
}

// execFileSync with an argument array: the ref is never interpreted by a shell.
const changed = execFileSync("git", ["diff", "--name-only", "--relative", `${base}...HEAD`], {
  cwd: ROOT,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);

const violations = findViolations(
  loadConfig(join(ROOT, "docs", "living-docs.config.json")),
  changed,
);
if (violations.length === 0) {
  console.log(`Living docs OK (${changed.length} changed file(s) checked).`);
  process.exit(0);
}
for (const { rule, triggers } of violations) {
  console.error(`\n${rule.change}`);
  console.error(`  changed: ${triggers.join(", ")}`);
  console.error(`  update at least one of: ${rule.update.join(", ")}`);
  if (rule.alsoCheck) console.error(`  also check: ${rule.alsoCheck}`);
}
console.error("\nUpdate the docs, or add the `docs-not-needed` label to the pull request.");
process.exit(1);
