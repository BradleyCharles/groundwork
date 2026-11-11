#!/usr/bin/env node
// End-to-end check: generate a project with the built CLI, then run the generated project's own checks.
//   node scripts/e2e.mjs <generate|static|db|a11y|all> [--preset minimal|full] [--dir ../e2e-app] [--clean]
// The GitHub workflow calls each phase as its own step; this script lets the same sequence run locally.
// Needs `npm run build` first, and Docker for the db phase.
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "packages", "create-groundwork", "dist", "cli.js");
const PHASES = ["generate", "static", "db", "a11y", "all"];

const args = process.argv.slice(2);
const phase = args[0];
const opt = (name, fallback) => (args.indexOf(name) === -1 ? fallback : args[args.indexOf(name) + 1]);
const preset = opt("--preset", "minimal");
const dir = resolve(ROOT, opt("--dir", join("..", "e2e-app")));

if (!PHASES.includes(phase)) {
  console.error(`Usage: e2e.mjs <${PHASES.join("|")}> [--preset minimal|full] [--dir ../e2e-app] [--clean]`);
  process.exit(2);
}
if (!/^[\w-]+$/.test(preset) || !existsSync(join(ROOT, "test", "presets", `${preset}.json`))) {
  console.error(`Unknown preset "${preset}". See test/presets/.`);
  process.exit(2);
}

// Public local-development values only. No secrets are passed to the build or the tests.
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "e2e-placeholder-public-key",
};

function step(title, cmd, cmdArgs, cwd = dir) {
  console.log(`\n=== ${title}\n$ ${cmd} ${cmdArgs.join(" ")}`);
  const r = spawnSync(cmd, cmdArgs, { cwd, env, stdio: "inherit", shell: process.platform === "win32" && cmd === "npm" });
  if (r.status !== 0) {
    console.error(`\nFAILED: ${title} (exit ${r.status ?? r.signal})`);
    process.exit(r.status || 1);
  }
}
const npm = (title, ...a) => step(title, "npm", a);

function capture(cmd, cmdArgs) {
  return spawnSync(cmd, cmdArgs, { cwd: dir, encoding: "utf8" });
}

function generate() {
  if (!existsSync(CLI)) {
    console.error("The CLI is not built. Run: npm run build");
    process.exit(2);
  }
  if (existsSync(dir)) {
    // Only ever delete a directory this script would have created.
    if (!args.includes("--clean") || !/^e2e/.test(basename(dir))) {
      console.error(`${dir} already exists. Pass --clean (the directory name must start with "e2e") to replace it.`);
      process.exit(2);
    }
    rmSync(dir, { recursive: true, force: true });
  }
  // --config runs without prompts, installs nothing here (the static phase does), and makes the initial commit.
  step("generate", process.execPath, [CLI, "new", dir, "--config", join(ROOT, "test", "presets", `${preset}.json`), "--no-install"], ROOT);

  const count = capture("git", ["rev-list", "--count", "HEAD"]);
  const status = capture("git", ["status", "--porcelain"]);
  if (count.stdout.trim() !== "1" || status.stdout.trim() !== "") {
    console.error(`Expected exactly one initial commit and a clean tree. commits=${count.stdout.trim()} status=${JSON.stringify(status.stdout.trim())}`);
    process.exit(1);
  }
  console.log("Initial commit present, tree clean.");
}

function staticChecks() {
  npm("install", "ci", "--no-audit", "--no-fund");
  npm("lint", "run", "lint");
  npm("format check", "run", "format:check");
  npm("typecheck", "run", "typecheck");
  npm("unit tests", "test");
  npm("AGENTS.md table is current", "run", "docs:render", "--", "--check");
  npm("AGENTS.md size and history lint", "run", "docs:lint");
  npm("build", "run", "build");
  npm("audit (high)", "audit", "--audit-level=high");
}

function dbChecks() {
  // Core services only; the checks do not need Studio, storage, realtime and so on.
  const exclude = "studio,storage-api,imgproxy,realtime,logflare,vector,mailpit,edge-runtime,postgres-meta";
  try {
    npm("start local Supabase", "run", "db:start", "--", "-x", exclude);
    npm("apply migrations", "run", "db:reset");
    npm("pgTAP tests", "run", "db:test");
    npm("regenerate schema docs", "run", "db:docs");
    // The initial commit contains the generated docs, so any drift shows up as a diff.
    step("generated docs match the migrations", "git", ["diff", "--exit-code", "--", "supabase/schema.sql", "supabase/policies.sql"]);
    npm("generated docs apply to a fresh database", "run", "db:verify");
  } finally {
    console.log("\n=== stop local Supabase");
    spawnSync("npx", ["supabase", "stop", "--no-backup"], { cwd: dir, env, stdio: "inherit", shell: process.platform === "win32" });
  }
}

function a11yChecks() {
  if (!existsSync(join(dir, ".next"))) npm("build (needed for the accessibility run)", "run", "build");
  step("install browser", "npx", ["playwright", "install", ...(process.env.CI ? ["--with-deps"] : []), "chromium"]);
  npm("axe accessibility checks", "run", "test:a11y");
}

if (phase === "generate" || phase === "all") generate();
if (phase === "static" || phase === "all") staticChecks();
if (phase === "db" || phase === "all") dbChecks();
if (phase === "a11y" || phase === "all") a11yChecks();
console.log(`\nE2E phase "${phase}" passed for preset "${preset}".`);
