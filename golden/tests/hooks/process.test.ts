// End-to-end: pipe real hook payloads into the scripts, as Claude Code does.
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const hooks = join(process.cwd(), ".claude", "hooks");

function run(script: string, payload: unknown, env: Record<string, string> = {}) {
  const input = typeof payload === "string" ? payload : JSON.stringify(payload);
  return spawnSync(process.execPath, [join(hooks, script)], {
    input,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

describe("hook processes", () => {
  it("guard-bash exits 2 with the reason on stderr for git commit", () => {
    const r = run("guard-bash.mjs", {
      tool_name: "Bash",
      tool_input: { command: "git commit -m x" },
    });
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/only the user commits/);
  });

  it("guard-bash exits 0 for an allowed command", () => {
    const r = run("guard-bash.mjs", { tool_name: "Bash", tool_input: { command: "npm run lint" } });
    expect(r.status).toBe(0);
  });

  it("guard-files exits 2 for .env.local and 0 for source", () => {
    expect(
      run("guard-files.mjs", { tool_name: "Write", tool_input: { file_path: ".env.local" } })
        .status,
    ).toBe(2);
    expect(
      run("guard-files.mjs", { tool_name: "Write", tool_input: { file_path: "lib/env.ts" } })
        .status,
    ).toBe(0);
  });

  it("fails open on malformed JSON and empty input, never exiting 1", () => {
    for (const script of [
      "guard-bash.mjs",
      "guard-files.mjs",
      "stop-check.mjs",
      "session-start.mjs",
      "format.mjs",
    ]) {
      expect(run(script, "{not json").status).toBe(0);
      expect(run(script, "").status).toBe(0);
    }
  });

  it("logs internal errors to .claude/hooks/.log", () => {
    run("guard-bash.mjs", "{not json");
    expect(existsSync(join(hooks, ".log"))).toBe(true);
    expect(readFileSync(join(hooks, ".log"), "utf8")).toMatch(/guard-bash internal error/);
  });

  it("session-start prints state from the project directory", () => {
    const dir = mkdtempSync(join(tmpdir(), "gw-hook-"));
    writeFileSync(
      join(dir, "SESSION_STATE.md"),
      "## Start Here\n- hello from state\n\n## Active Goal\nG\n\n## Blockers\n- none\n",
    );
    const r = run(
      "session-start.mjs",
      { hook_event_name: "SessionStart" },
      { CLAUDE_PROJECT_DIR: dir },
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("hello from state");
  });

  it("stop-check blocks an over-cap state file once, then lets the stop through", () => {
    const dir = mkdtempSync(join(tmpdir(), "gw-hook-"));
    mkdirSync(join(dir, "docs"));
    writeFileSync(
      join(dir, "SESSION_STATE.md"),
      Array.from({ length: 200 }, (_, i) => `l${i}`).join("\n"),
    );
    const first = run(
      "stop-check.mjs",
      { hook_event_name: "Stop", stop_hook_active: false },
      { CLAUDE_PROJECT_DIR: dir },
    );
    expect(first.status).toBe(2);
    expect(first.stderr).toMatch(/cap is 150/);
    const second = run(
      "stop-check.mjs",
      { hook_event_name: "Stop", stop_hook_active: true },
      { CLAUDE_PROJECT_DIR: dir },
    );
    expect(second.status).toBe(0);
  });
});
