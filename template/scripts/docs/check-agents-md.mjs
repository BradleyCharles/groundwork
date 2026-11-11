#!/usr/bin/env node
// AGENTS.md must stay small and describe only current rules.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_BYTES = 10 * 1024;

// Dates and plan numbers go stale. Ordinary words ("used to", "no longer") are not flagged: they appear
// in normal sentences, including a project's own scope statement.
const HISTORY_PATTERNS = [
  [/\b\d{4}-\d{2}-\d{2}\b/, "a date (history belongs in docs/decisions/ or the changelog)"],
  [/\b(?:phase|week|milestone|roadmap item|roadmap #)\s*#?\d+/i, "a plan or roadmap number"],
];

/** Content between the Next.js markers is managed by Next.js and is not linted. */
export function stripManaged(markdown) {
  return markdown.replace(
    /<!-- BEGIN:nextjs-agent-rules -->[\s\S]*?<!-- END:nextjs-agent-rules -->/g,
    "",
  );
}

export function lintAgentsMd(markdown) {
  const problems = [];
  const bytes = Buffer.byteLength(markdown, "utf8");
  if (bytes > MAX_BYTES) problems.push(`AGENTS.md is ${bytes} bytes; the limit is ${MAX_BYTES}`);
  stripManaged(markdown)
    .split("\n")
    .forEach((line, i) => {
      for (const [re, what] of HISTORY_PATTERNS) {
        if (re.test(line))
          problems.push(`line ${i + 1}: contains ${what}: ${line.trim().slice(0, 80)}`);
      }
    });
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const problems = lintAgentsMd(readFileSync(join(root, "AGENTS.md"), "utf8"));
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log("AGENTS.md size and history lint passed.");
}
