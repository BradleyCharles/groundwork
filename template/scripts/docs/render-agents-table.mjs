#!/usr/bin/env node
// Renders docs/living-docs.config.json into AGENTS.md between the living-docs markers.
// `--check` exits 1 if AGENTS.md is out of date instead of writing.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, renderTable, replaceBlock } from "./living-docs-lib.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const agentsPath = join(ROOT, "AGENTS.md");

const current = readFileSync(agentsPath, "utf8");
const next = replaceBlock(
  current,
  renderTable(loadConfig(join(ROOT, "docs", "living-docs.config.json"))),
);

if (process.argv.includes("--check")) {
  if (next !== current) {
    console.error(
      "AGENTS.md living-docs table is out of date. Run: node scripts/docs/render-agents-table.mjs",
    );
    process.exit(1);
  }
  console.log("AGENTS.md living-docs table is up to date.");
} else {
  writeFileSync(agentsPath, next);
  console.log("Rendered living-docs table into AGENTS.md");
}
