#!/usr/bin/env node
// PreToolUse (Read|Edit|Write|MultiEdit|NotebookEdit): protect env files and generated schema docs.
import { isAbsolute, posix, resolve } from "node:path";
import { isMain, runHook } from "./hook-lib.mjs";

const GENERATED = ["supabase/schema.sql", "supabase/policies.sql"];

export function isEnvFile(path) {
  const name = path.split("/").pop()?.toLowerCase() ?? "";
  if (name === ".env.example") return false;
  return name.startsWith(".env") || name.endsWith(".env") || name.includes(".env.");
}

export function checkPath(filePath, toolName, projectDir) {
  if (typeof filePath !== "string" || !filePath) return null;
  const absolute = isAbsolute(filePath) ? filePath : resolve(projectDir, filePath);
  const normalized = posix.normalize(absolute.replaceAll("\\", "/"));
  const lower = normalized.toLowerCase();

  if (isEnvFile(normalized)) {
    return "Blocked: .env files hold secrets and are off limits (AGENTS.md, Hard Constraints). Ask the user for the value, or edit .env.example for names only.\n";
  }
  if (toolName !== "Read" && GENERATED.some((g) => lower.endsWith(`/${g}`))) {
    return "Blocked: supabase/schema.sql and supabase/policies.sql are generated. Write a migration in supabase/migrations/, run `npx supabase db reset`, then `npm run db:docs` (AGENTS.md, Database Change Procedure).\n";
  }
  return null;
}

export async function handle(input, { projectDir }) {
  const target = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
  const reason = checkPath(target, input.tool_name, projectDir);
  return reason ? { code: 2, stderr: reason } : { code: 0 };
}

if (isMain(import.meta.url)) await runHook("guard-files", handle);
