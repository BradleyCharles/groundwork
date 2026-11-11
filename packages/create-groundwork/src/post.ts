import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export interface StepResult {
  ok: boolean;
  detail?: string;
}

function run(cmd: string, args: string[], cwd: string, inherit = false): StepResult {
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    stdio: inherit ? "inherit" : "pipe",
    shell: process.platform === "win32" && cmd === "npm",
  });
  if (r.error) return { ok: false, detail: r.error.message };
  return r.status === 0
    ? { ok: true }
    : { ok: false, detail: (r.stderr ?? "").trim().split("\n").slice(-3).join("\n") };
}

/** Rewrites the living-docs table in AGENTS.md from docs/living-docs.config.json. */
export function renderAgentsTable(dir: string): StepResult {
  const script = join(dir, "scripts", "docs", "render-agents-table.mjs");
  return existsSync(script)
    ? run(process.execPath, [script], dir)
    : { ok: true, detail: "no render script" };
}

export const gitInit = (dir: string): StepResult => run("git", ["init", "-q", "-b", "main"], dir);
export const npmInstall = (dir: string): StepResult =>
  run("npm", ["ci", "--no-audit", "--no-fund"], dir, true);

/** The only commit the tool ever makes: the initial one, and only when the user agreed. */
export function initialCommit(dir: string): StepResult {
  const add = run("git", ["add", "-A"], dir);
  if (!add.ok) return add;
  return run("git", ["commit", "-q", "-m", "Initial commit from groundwork"], dir);
}
