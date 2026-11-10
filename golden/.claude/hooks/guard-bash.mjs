#!/usr/bin/env node
// PreToolUse (Bash): block commands the project rules forbid. Exit code 2 is the only code
// that blocks; the reason on stderr is shown to the model. This is a backstop, not the
// authority: CI checks the same rules.
import { basename } from "node:path";
import { isMain, runHook } from "./hook-lib.mjs";

const SEPARATORS = new Set([";", "|", "&", "\n", "(", ")", "{", "}", "`"]);

/** Splits a command line into simple commands, respecting quotes. */
export function splitSegments(command) {
  const segments = [];
  let current = "";
  let quote = null;
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (quote) {
      current += c;
      if (c === quote && command[i - 1] !== "\\") quote = null;
    } else if (c === "'" || c === '"') {
      quote = c;
      current += c;
    } else if (SEPARATORS.has(c)) {
      segments.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  segments.push(current);
  return segments.map((s) => s.trim()).filter(Boolean);
}

/** Whitespace tokenizer that removes quotes and handles backslash escapes. */
export function tokenize(segment) {
  const tokens = [];
  let current = "";
  let quote = null;
  let has = false;
  for (let i = 0; i < segment.length; i++) {
    const c = segment[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === "\\" && quote === '"' && i + 1 < segment.length) current += segment[++i];
      else current += c;
    } else if (c === "'" || c === '"') {
      quote = c;
      has = true;
    } else if (c === "\\" && i + 1 < segment.length) {
      current += segment[++i];
      has = true;
    } else if (/\s/.test(c)) {
      if (has || current) tokens.push(current);
      current = "";
      has = false;
    } else {
      current += c;
      has = true;
    }
  }
  if (has || current) tokens.push(current);
  return tokens;
}

const KEYWORDS = new Set([
  "if",
  "then",
  "else",
  "elif",
  "do",
  "while",
  "until",
  "!",
  "time",
  "exec",
  "command",
  "builtin",
  "nohup",
  "sudo",
  "nice",
  "env",
  "xargs",
]);
const SHELLS = new Set(["bash", "sh", "zsh", "dash", "ksh"]);
const GIT_OPTS_WITH_VALUE = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--exec-path",
  "--super-prefix",
  "--config-env",
]);
const NODE_PKG_MANAGERS = new Set(["npm", "pnpm", "yarn", "bun"]);
const INSTALL_WORDS = new Set([
  "install",
  "i",
  "add",
  "in",
  "ins",
  "inst",
  "insta",
  "instal",
  "isnt",
  "isnta",
  "isntal",
  "isntall",
]);

const BLOCK = {
  commit:
    "Blocked: only the user commits or pushes (AGENTS.md, Hard Constraints). Summarize the change and ask the user to commit.",
  push: "Blocked: only the user commits or pushes (AGENTS.md, Hard Constraints). Ask the user to push.",
  reset:
    "Blocked: `git reset --hard` discards work. Ask the user to run it if they really want it.",
  dbpush:
    "Blocked: `supabase db push` changes a remote database. Schema changes go through migrations the user applies (AGENTS.md, Database Change Procedure).",
  dependency:
    "Blocked: no new dependencies without explicit user approval (AGENTS.md, Hard Constraints). Ask the user, naming the package and why.",
};

/** Returns a reason string if the command must be blocked, otherwise null. */
export function checkCommand(command, depth = 0) {
  if (typeof command !== "string" || depth > 4) return null;

  // Command substitutions can hide a command inside another one.
  for (const m of command.matchAll(/\$\(([^()]*)\)|`([^`]*)`/g)) {
    const reason = checkCommand(m[1] ?? m[2] ?? "", depth + 1);
    if (reason) return reason;
  }

  for (const segment of splitSegments(command)) {
    const reason = checkTokens(tokenize(segment), depth);
    if (reason) return reason;
  }
  return null;
}

function checkTokens(tokens, depth) {
  let i = 0;
  // Leading assignments, shell keywords, and wrappers do not change what runs.
  while (i < tokens.length) {
    const t = tokens[i];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(t) || KEYWORDS.has(t)) i++;
    else if (/^-/.test(t) && i > 0 && KEYWORDS.has(tokens[i - 1])) i++;
    else break;
  }
  const program = basename(tokens[i] ?? "")
    .toLowerCase()
    .replace(/\.(exe|cmd)$/, "");
  const args = tokens.slice(i + 1);
  if (!program) return null;

  if (SHELLS.has(program)) {
    const c = args.findIndex((a) => /^-[a-z]*c[a-z]*$/.test(a));
    if (c !== -1 && args[c + 1]) return checkCommand(args[c + 1], depth + 1);
    return null;
  }
  if (program === "eval") return checkCommand(args.join(" "), depth + 1);

  if (program === "git") return checkGit(args);
  if (program === "supabase") return checkSupabase(args);

  if (
    program === "npx" ||
    program === "bunx" ||
    (program === "pnpm" && (args[0] === "dlx" || args[0] === "exec")) ||
    (program === "npm" && args[0] === "exec")
  ) {
    let rest = program === "npx" || program === "bunx" ? args : args.slice(1);
    while (rest[0]?.startsWith("-") && rest[0] !== "--") rest = rest.slice(1);
    if (rest[0] === "--") rest = rest.slice(1);
    return checkTokens(rest, depth + 1);
  }

  if (NODE_PKG_MANAGERS.has(program)) {
    const nonFlags = args.filter((a) => !a.startsWith("-"));
    const sub = nonFlags[0];
    if (!sub || !INSTALL_WORDS.has(sub)) return null;
    // `npm install` alone installs from the lockfile and is allowed. A package name is not.
    if (sub === "add") return BLOCK.dependency;
    return nonFlags.length > 1 ? BLOCK.dependency : null;
  }
  return null;
}

function checkGit(args) {
  let i = 0;
  while (i < args.length && args[i].startsWith("-")) {
    const opt = args[i];
    i += GIT_OPTS_WITH_VALUE.has(opt) ? 2 : 1;
  }
  const sub = args[i];
  const rest = args.slice(i + 1);
  if (sub === "commit") return BLOCK.commit;
  if (sub === "push") return BLOCK.push;
  if (sub === "reset" && rest.includes("--hard")) return BLOCK.reset;
  return null;
}

function checkSupabase(args) {
  const words = args.filter((a) => !a.startsWith("-"));
  return words[0] === "db" && words[1] === "push" ? BLOCK.dbpush : null;
}

export async function handle(input) {
  if (input.tool_name && input.tool_name !== "Bash") return { code: 0 };
  const reason = checkCommand(input.tool_input?.command);
  return reason ? { code: 2, stderr: `${reason}\n` } : { code: 0 };
}

if (isMain(import.meta.url)) await runHook("guard-bash", handle);
