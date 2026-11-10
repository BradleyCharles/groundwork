#!/usr/bin/env node
// PostToolUse (Edit|Write): run Prettier on the edited file only. Never blocks.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { isMain, log, runHook } from "./hook-lib.mjs";

const FORMATTABLE = /\.(ts|tsx|js|jsx|mjs|cjs|json|css|md)$/i;

export function shouldFormat(filePath) {
  return (
    typeof filePath === "string" &&
    FORMATTABLE.test(filePath) &&
    !/[\\/](node_modules|\.next)[\\/]/.test(filePath)
  );
}

export async function handle(input, { projectDir }) {
  const target = input.tool_input?.file_path;
  if (!shouldFormat(target)) return { code: 0 };
  const file = isAbsolute(target) ? target : resolve(projectDir, target);
  const bin = join(projectDir, "node_modules", "prettier", "bin", "prettier.cjs");
  if (!existsSync(file) || !existsSync(bin)) return { code: 0 };
  const run = spawnSync(process.execPath, [bin, "--write", "--ignore-unknown", file], {
    cwd: projectDir,
    encoding: "utf8",
  });
  if (run.status !== 0)
    log("format", `prettier exited ${run.status}: ${run.stderr.trim().slice(0, 200)}`);
  return { code: 0 };
}

if (isMain(import.meta.url)) await runHook("format", handle);
