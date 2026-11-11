#!/usr/bin/env node
// SessionStart: print the parts of SESSION_STATE.md the next session needs first.
// Stdout from this event is added to the model's context.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isMain, runHook } from "./hook-lib.mjs";

export const LINE_CAP = 150;
const SECTIONS = ["Start Here", "Active Goal", "Blockers"];

export function section(markdown, title) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === `## ${title}`);
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith("## "));
  const body = (end === -1 ? rest : rest.slice(0, end)).filter((l) => !/^\s*<!--.*-->\s*$/.test(l));
  return body.join("\n").trim();
}

export function buildContext(state) {
  if (state === null) {
    return "SESSION_STATE.md does not exist. Create it from docs/templates/SESSION_STATE.md.\n";
  }
  const out = ["Session state (from SESSION_STATE.md):"];
  for (const title of SECTIONS) {
    const body = section(state, title);
    out.push(`\n## ${title}\n${body || "(empty)"}`);
  }
  const count = state.split(/\r?\n/).length;
  if (count > LINE_CAP) {
    out.push(
      `\nNote: SESSION_STATE.md has ${count} lines (cap ${LINE_CAP}). Condense it at the next handoff.`,
    );
  }
  return out.join("\n") + "\n";
}

export async function handle(_input, { projectDir }) {
  const file = join(projectDir, "SESSION_STATE.md");
  const state = existsSync(file) ? readFileSync(file, "utf8") : null;
  return { code: 0, stdout: buildContext(state) };
}

if (isMain(import.meta.url)) await runHook("session-start", handle);
