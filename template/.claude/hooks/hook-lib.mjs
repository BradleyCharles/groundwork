// Shared helpers for Claude Code hooks. Hooks fail open: an internal error is logged and
// the hook exits 0, so a bug here can never brick a session. Only a deliberate result with
// code 2 blocks an action.
import { appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const HOOK_DIR = dirname(fileURLToPath(import.meta.url));

export function projectDir() {
  return process.env.CLAUDE_PROJECT_DIR || join(HOOK_DIR, "..", "..");
}

export function log(hook, message) {
  try {
    appendFileSync(join(HOOK_DIR, ".log"), `${new Date().toISOString()} ${hook} ${message}\n`);
  } catch {
    // Logging must never throw.
  }
}

export function isMain(metaUrl) {
  return Boolean(process.argv[1]) && pathToFileURL(process.argv[1]).href === metaUrl;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * handler(input, ctx) returns { code?, stdout?, stderr? }. Only code 2 blocks;
 * any other code is coerced to 0.
 */
export async function runHook(name, handler) {
  let result = { code: 0 };
  try {
    const raw = await readStdin();
    const input = raw.trim() ? JSON.parse(raw) : {};
    result = (await handler(input, { projectDir: projectDir() })) ?? { code: 0 };
  } catch (error) {
    log(name, `internal error (failing open): ${error?.stack ?? error}`);
    result = { code: 0 };
  }
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exitCode = result.code === 2 ? 2 : 0;
}
