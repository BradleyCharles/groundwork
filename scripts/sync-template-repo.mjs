#!/usr/bin/env node
// Replaces the contents of the template repository with the generated template-mode output.
//   TOKEN=... VERSION=v0.1.0 TEMPLATE_REPO=owner/groundwork-template node scripts/sync-template-repo.mjs ../template-out [--dry-run]
//
// The token is given to git through its environment (GIT_CONFIG_*), never in a URL or on a command
// line, so it is not stored in .git/config and cannot show up in a process list or a remote URL.
// Anything printed is scrubbed of the token first.
// TEMPLATE_REMOTE_URL overrides the remote (used by the tests, with a local bare repository and no token).
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MARKER_FILE = ".groundwork-init.json";
const README = join(HERE, "template-readme.md");

export function redact(text, secrets) {
  let out = String(text ?? "");
  for (const s of secrets.filter(Boolean)) out = out.split(s).join("***");
  return out;
}

export function authEnv(token) {
  const basic = Buffer.from(`x-access-token:${token}`).toString("base64");
  return {
    secrets: [token, basic],
    env: {
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
      GIT_CONFIG_VALUE_0: `Authorization: basic ${basic}`,
    },
  };
}

function fail(message, secrets = []) {
  console.error(redact(message, secrets));
  process.exit(1);
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const outDir = args.find((a) => !a.startsWith("--"));
  const { TOKEN, VERSION, TEMPLATE_REPO, TEMPLATE_REMOTE_URL } = process.env;

  if (!outDir) fail("Usage: sync-template-repo.mjs <template-out directory> [--dry-run]");
  const source = resolve(outDir);
  if (!existsSync(source) || !statSync(source).isDirectory()) fail(`${source} is not a directory`);
  // Only template-mode output may be pushed. A filled-in project must never end up in the template repo.
  if (!existsSync(join(source, MARKER_FILE)))
    fail(`${MARKER_FILE} not found in ${source}. Generate with --template-mode.`);
  if (!VERSION || !/^[\w.+-]{1,64}$/.test(VERSION))
    fail("VERSION must be a release tag such as v0.1.0");

  let remote;
  let extraEnv = {};
  let secrets = [];
  if (TEMPLATE_REMOTE_URL) {
    remote = TEMPLATE_REMOTE_URL;
  } else {
    if (!TOKEN) fail("TOKEN is not set");
    if (!TEMPLATE_REPO || !/^[\w.-]+\/[\w.-]+$/.test(TEMPLATE_REPO))
      fail("TEMPLATE_REPO must look like owner/groundwork-template");
    remote = `https://github.com/${TEMPLATE_REPO}.git`;
    ({ env: extraEnv, secrets } = authEnv(TOKEN));
  }
  secrets.push(TOKEN);

  const work = mkdtempSync(join(tmpdir(), "gw-template-"));
  const repo = join(work, "repo");
  const git = (gitArgs, cwd = repo) => {
    const r = spawnSync("git", gitArgs, {
      cwd,
      encoding: "utf8",
      env: { ...process.env, ...extraEnv, GIT_TERMINAL_PROMPT: "0" },
    });
    if (r.status !== 0)
      fail(`git ${gitArgs[0]} failed:\n${redact(r.stderr || r.stdout, secrets)}`, secrets);
    return r.stdout.trim();
  };

  try {
    git(["clone", "--quiet", remote, repo], work);
    git(["checkout", "--quiet", "-B", "main"]);

    // Replace everything except .git so files removed from the template are removed here too.
    for (const name of readdirSync(repo))
      if (name !== ".git") rmSync(join(repo, name), { recursive: true, force: true });
    cpSync(source, repo, { recursive: true, filter: (src) => !/(^|[\\/])\.git$/.test(src) });
    cpSync(README, join(repo, "README.md"));

    git(["add", "-A"]);
    if (git(["status", "--porcelain"]) === "") {
      console.log("The template repository is already up to date.");
      return;
    }
    if (dryRun) {
      console.log(`Dry run: would commit these changes:\n${git(["status", "--short"])}`);
      return;
    }

    git([
      "-c",
      "user.name=groundwork-bot",
      "-c",
      "user.email=groundwork-bot@users.noreply.github.com",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "--quiet",
      "-m",
      `Sync from groundwork ${VERSION} [skip ci]`,
    ]);
    git(["push", "--quiet", "origin", "main"]);
    console.log(
      `Pushed ${git(["rev-parse", "--short", "HEAD"])} (${VERSION}) to ${TEMPLATE_REMOTE_URL ? "the test remote" : TEMPLATE_REPO}.`,
    );
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
