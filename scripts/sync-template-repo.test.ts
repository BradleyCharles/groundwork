import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { devNull, tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { runInit } from "../packages/create-groundwork/src/commands/init.js";
import { runNew } from "../packages/create-groundwork/src/commands/new.js";
import { readProjectFiles } from "../packages/create-groundwork/src/fsops.js";
// @ts-expect-error plain .mjs without types
import { authEnv, redact } from "./sync-template-repo.mjs";

// Built at runtime so no secret-shaped literal sits in the repository (the secret scanner would flag it).
const FAKE = ["fake", "credential", "for", "tests", "only"].join("-");
const script = fileURLToPath(new URL("./sync-template-repo.mjs", import.meta.url));
const tmp = () => mkdtempSync(join(tmpdir(), "gw-sync-"));
const gitEnv = { ...process.env, GIT_CONFIG_GLOBAL: devNull, GIT_CONFIG_SYSTEM: devNull };
const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", args, { cwd, encoding: "utf8", env: gitEnv }).trim();
const quiet = {
  nonInteractive: true,
  install: false,
  git: false,
  commit: "no" as const,
  out: () => {},
};

/** Template-mode output, as the workflow's generate step produces it. */
async function templateOut(): Promise<string> {
  const dir = join(tmp(), "template-out");
  await runNew({ ...quiet, dir, partial: {}, templateMode: true });
  return dir;
}

function sync(out: string, remote: string, env: Record<string, string> = {}, extra: string[] = []) {
  return spawnSync(process.execPath, [script, out, ...extra], {
    encoding: "utf8",
    env: { ...gitEnv, TEMPLATE_REMOTE_URL: remote, VERSION: "v0.1.0", ...env },
  });
}

let remote: string;
beforeEach(() => {
  remote = join(tmp(), "remote.git");
  git(tmp(), "init", "--bare", "--quiet", "-b", "main", remote);
});

const clone = () => {
  const dir = join(tmp(), "clone");
  git(tmp(), "clone", "--quiet", remote, dir);
  return dir;
};

describe("sync-template-repo", () => {
  it("pushes template output, a README, and a bot commit with the version", async () => {
    const out = await templateOut();
    const r = sync(out, remote);
    expect(r.status, r.stderr).toBe(0);

    const c = clone();
    expect(existsSync(join(c, ".groundwork-init.json"))).toBe(true);
    expect(readFileSync(join(c, "README.md"), "utf8")).toContain("groundwork-template-readme");
    expect(readFileSync(join(c, "package.json"), "utf8")).toContain("{{PACKAGE_NAME}}");
    expect(git(c, "log", "-1", "--format=%an|%ae|%s")).toBe(
      "groundwork-bot|groundwork-bot@users.noreply.github.com|Sync from groundwork v0.1.0 [skip ci]",
    );
    expect(git(c, "rev-list", "--count", "HEAD")).toBe("1");
  });

  it("makes no new commit when nothing changed, and one when something did", async () => {
    const out = await templateOut();
    expect(sync(out, remote).status).toBe(0);
    const again = sync(out, remote);
    expect(again.status).toBe(0);
    expect(again.stdout).toMatch(/already up to date/);
    expect(git(clone(), "rev-list", "--count", "HEAD")).toBe("1");

    writeFileSync(join(out, "SECURITY.md"), "changed\n");
    expect(sync(out, remote, { VERSION: "v0.2.0" }).status).toBe(0);
    const c = clone();
    expect(git(c, "rev-list", "--count", "HEAD")).toBe("2");
    expect(git(c, "log", "-1", "--format=%s")).toContain("v0.2.0");
  });

  it("removes files that are no longer in the template", async () => {
    const out = await templateOut();
    expect(sync(out, remote).status).toBe(0);
    rmSync(join(out, "SECURITY.md"));
    expect(sync(out, remote).status).toBe(0);
    expect(existsSync(join(clone(), "SECURITY.md"))).toBe(false);
  });

  it("does not push in a dry run", async () => {
    const r = sync(await templateOut(), remote, {}, ["--dry-run"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Dry run/);
    expect(() => git(tmp(), "--git-dir", remote, "rev-parse", "HEAD")).toThrow();
  });

  it("refuses a directory that is not template-mode output", () => {
    const filled = tmp();
    writeFileSync(join(filled, "package.json"), "{}");
    const r = sync(filled, remote);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/--template-mode/);
  });

  it("rejects a bad version, and a missing token or repo when no test remote is given", async () => {
    const out = await templateOut();
    expect(sync(out, remote, { VERSION: "v1; rm -rf /" }).status).toBe(1);
    const noToken = spawnSync(process.execPath, [script, out], {
      encoding: "utf8",
      env: { ...gitEnv, VERSION: "v1", TEMPLATE_REPO: "o/r", TEMPLATE_REMOTE_URL: "" },
    });
    expect(noToken.status).toBe(1);
    expect(noToken.stderr).toMatch(/TOKEN is not set/);
    const badRepo = spawnSync(process.execPath, [script, out], {
      encoding: "utf8",
      env: {
        ...gitEnv,
        VERSION: "v1",
        TOKEN: "t",
        TEMPLATE_REPO: "not a repo",
        TEMPLATE_REMOTE_URL: "",
      },
    });
    expect(badRepo.stderr).toMatch(/owner\/groundwork-template/);
  });

  describe("the token", () => {
    it("is redacted from output, including the base64 form used in the auth header", () => {
      const { secrets, env } = authEnv(FAKE);
      const text = `fatal: ${env.GIT_CONFIG_VALUE_0} and ${FAKE}`;
      const clean = redact(text, secrets);
      expect(clean).not.toContain(FAKE);
      expect(clean).not.toContain(secrets[1]);
    });

    it("goes to git through the environment only: never in a URL, and not in the pushed repository", async () => {
      const out = await templateOut();
      const r = sync(out, remote, { TOKEN: FAKE });
      expect(r.status).toBe(0);
      expect(r.stdout + r.stderr).not.toContain(FAKE);
      const { env } = authEnv(FAKE);
      expect(env.GIT_CONFIG_VALUE_0).not.toContain(FAKE);
      expect(env.GIT_CONFIG_KEY_0).toBe("http.https://github.com/.extraheader");
      const c = clone();
      expect(readFileSync(join(c, ".git", "config"), "utf8")).not.toContain(FAKE);
      expect(git(c, "log", "-p")).not.toContain(FAKE);
    });
  });
});

describe("exit criterion: a repo created from the template and initialized matches the CLI", () => {
  it.each([
    ["defaults", {}],
    [
      "every module and roles",
      {
        projectName: "Acme Portal",
        packageName: "acme-portal",
        roles: ["admin", "editor"],
        modules: ["ai", "crypto", "email", "supabase-mcp", "rolecheck"],
      },
    ],
  ])("%s", async (_label, partial) => {
    const out = await templateOut();
    expect(sync(out, remote).status).toBe(0);

    // "Use this template" copies the files without history; the clone minus .git models that.
    // Same directory name for both: defaults derive the package name from it.
    const user = join(tmp(), "app");
    cpSync(clone(), user, { recursive: true, filter: (src) => !/(^|[\\/])\.git$/.test(src) });
    expect(existsSync(join(user, "README.md"))).toBe(true);
    mkdirSync(user, { recursive: true });

    await runInit({
      cwd: user,
      partial: partial as never,
      nonInteractive: true,
      install: false,
      out: () => {},
    });

    const reference = join(tmp(), "app");
    await runNew({ ...quiet, dir: reference, partial: partial as never, templateMode: false });
    expect(readProjectFiles(user)).toEqual(readProjectFiles(reference));
  });
});
