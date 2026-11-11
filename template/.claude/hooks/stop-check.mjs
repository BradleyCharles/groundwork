#!/usr/bin/env node
// Stop: keep SESSION_STATE.md under its cap (blocks once) and warn when changed code has no
// matching doc change (never blocks). Honors stop_hook_active so it cannot loop.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isMain, log, runHook } from "./hook-lib.mjs";
import { findViolations, loadConfig } from "../../scripts/docs/living-docs-lib.mjs";

export const LINE_CAP = 150;

export function lineCount(text) {
  return text.replace(/\r?\n$/, "").split(/\r?\n/).length;
}

/** Changed paths relative to the project: tracked changes plus untracked files. */
export function changedFiles(projectDir) {
  const run = (args) => spawnSync("git", args, { cwd: projectDir, encoding: "utf8" });
  const status = run(["status", "--porcelain", "--untracked-files=all", "--", "."]);
  if (status.status !== 0) return [];
  const toplevel = run(["rev-parse", "--show-prefix"]);
  const prefix = toplevel.status === 0 ? toplevel.stdout.trim() : "";
  return status.stdout
    .split("\n")
    .filter((l) => l.length > 3)
    .map((l) =>
      l
        .slice(3)
        .replace(/^.* -> /, "")
        .replace(/^"|"$/g, ""),
    )
    .map((p) => (prefix && p.startsWith(prefix) ? p.slice(prefix.length) : p));
}

export function evaluate({ stopHookActive, stateText, files, config }) {
  if (!stopHookActive && stateText !== null && lineCount(stateText) > LINE_CAP) {
    return {
      code: 2,
      stderr: `SESSION_STATE.md has ${lineCount(stateText)} lines; the cap is ${LINE_CAP}. Rewrite it shorter (copy the old version to docs/sessions/ first), then finish.\n`,
    };
  }
  const violations = config ? findViolations(config, files) : [];
  if (violations.length === 0) return { code: 0 };
  const lines = violations.map(
    (v) =>
      `- ${v.rule.change}: update one of ${v.rule.update.join(", ")}${v.rule.alsoCheck ? ` (also check: ${v.rule.alsoCheck})` : ""}`,
  );
  return {
    code: 0,
    stdout:
      JSON.stringify({ systemMessage: `Living docs may be out of date:\n${lines.join("\n")}` }) +
      "\n",
  };
}

export async function handle(input, { projectDir }) {
  const stateFile = join(projectDir, "SESSION_STATE.md");
  const configFile = join(projectDir, "docs", "living-docs.config.json");
  let config = null;
  try {
    config = existsSync(configFile) ? loadConfig(configFile) : null;
  } catch (error) {
    log("stop-check", `could not read living-docs config: ${error.message}`);
  }
  return evaluate({
    stopHookActive: Boolean(input.stop_hook_active),
    stateText: existsSync(stateFile) ? readFileSync(stateFile, "utf8") : null,
    files: config ? changedFiles(projectDir) : [],
    config,
  });
}

if (isMain(import.meta.url)) await runHook("stop-check", handle);
