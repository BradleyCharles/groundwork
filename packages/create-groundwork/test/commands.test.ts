import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { devNull, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultAnswers,
  DEFAULT_DESCRIPTION,
  DEFAULT_SCOPE,
  MODULE_IDS,
  type Answers,
} from "../src/answers.js";
import { loadAssets } from "../src/assets.js";
import { runInit } from "../src/commands/init.js";
import { runNew } from "../src/commands/new.js";
import { UsageError, readProjectFiles, writePlan } from "../src/fsops.js";
import { main, readConfig } from "../src/main.js";
import { buildPlan, INIT_MARKER } from "../src/plan.js";

const tmp = () => mkdtempSync(join(tmpdir(), "gw-"));
const base = {
  nonInteractive: true,
  install: false,
  git: false,
  commit: "no" as const,
  templateMode: false,
  out: () => {},
};
const golden: Partial<Answers> = {
  projectName: "Groundwork App",
  packageName: "golden",
  description: DEFAULT_DESCRIPTION,
  scope: DEFAULT_SCOPE,
};

describe("new", () => {
  it("writes the planned files into a new directory", async () => {
    const dir = join(tmp(), "app");
    const { files } = await runNew({ ...base, dir, partial: golden });
    const expected = buildPlan(loadAssets(), { ...defaultAnswers("golden"), ...golden } as Answers);
    expect(files).toBe(expected.files.length);
    for (const f of expected.files) expect(readFileSync(join(dir, f.path), "utf8")).toBe(f.content);
  });

  it("refuses a non-empty directory and leaves it untouched", async () => {
    const dir = tmp();
    writeFileSync(join(dir, "keep.txt"), "mine");
    await expect(runNew({ ...base, dir, partial: {} })).rejects.toThrow(/not empty/);
    expect(readFileSync(join(dir, "keep.txt"), "utf8")).toBe("mine");
    expect(existsSync(join(dir, "package.json"))).toBe(false);
  });

  it("accepts an empty existing directory", async () => {
    const dir = tmp();
    await runNew({ ...base, dir, partial: {} });
    expect(existsSync(join(dir, "package.json"))).toBe(true);
  });

  it("reports every invalid answer before writing anything", async () => {
    const dir = join(tmp(), "app");
    const err = await runNew({
      ...base,
      dir,
      partial: { projectName: '"bad"', roles: ["Bad"] },
    }).catch((e) => e);
    expect(err).toBeInstanceOf(UsageError);
    expect(err.message).toMatch(/projectName/);
    expect(err.message).toMatch(/roles/);
    expect(existsSync(dir)).toBe(false);
  });

  it("needs prompts or --yes", async () => {
    await expect(
      runNew({ ...base, nonInteractive: false, dir: join(tmp(), "a"), partial: {} }),
    ).rejects.toThrow(/--yes/);
  });

  it("uses the prompt answers when interactive, and validates them again", async () => {
    const dir = join(tmp(), "a");
    const ask = async (initial: Answers): Promise<Answers> => ({
      ...initial,
      projectName: "Asked App",
      modules: ["crypto"],
    });
    await runNew({ ...base, nonInteractive: false, ask, dir, partial: {} });
    expect(readFileSync(join(dir, "AGENTS.md"), "utf8")).toMatch(/^# Asked App$/m);
    expect(existsSync(join(dir, "lib", "crypto.ts"))).toBe(true);

    const bad = async (initial: Answers): Promise<Answers> => ({
      ...initial,
      projectName: "<bad>",
    });
    await expect(
      runNew({ ...base, nonInteractive: false, ask: bad, dir: join(tmp(), "b"), partial: {} }),
    ).rejects.toThrow(/projectName/);
  });

  it("refuses to write outside the project directory", () => {
    const dir = tmp();
    expect(() =>
      writePlan(dir, { files: [{ path: "../escape.txt", content: "x" }], deletes: [] }),
    ).toThrow(/outside/);
    expect(() => writePlan(dir, { files: [], deletes: ["../../etc/passwd"] })).toThrow(/outside/);
  });
});

describe("initial commit", () => {
  const env = {
    GIT_AUTHOR_NAME: "t",
    GIT_AUTHOR_EMAIL: "t@example.invalid",
    GIT_COMMITTER_NAME: "t",
    GIT_COMMITTER_EMAIL: "t@example.invalid",
  };
  const saved = { ...process.env };
  beforeEach(() =>
    Object.assign(process.env, env, {
      GIT_CONFIG_GLOBAL: devNull,
      GIT_CONFIG_SYSTEM: devNull,
    }),
  );
  afterEach(() => {
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  });
  const commits = (dir: string) => {
    try {
      return Number(
        execFileSync("git", ["rev-list", "--count", "HEAD"], {
          cwd: dir,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        }),
      );
    } catch {
      return 0;
    }
  };

  it("commits once with commit=yes, and the tree is clean afterwards", async () => {
    const dir = join(tmp(), "a");
    await runNew({ ...base, dir, partial: {}, git: true, commit: "yes" });
    expect(commits(dir)).toBe(1);
    expect(execFileSync("git", ["status", "--porcelain"], { cwd: dir, encoding: "utf8" })).toBe("");
  });
  it("makes no commit with commit=no", async () => {
    const dir = join(tmp(), "a");
    await runNew({ ...base, dir, partial: {}, git: true, commit: "no" });
    expect(existsSync(join(dir, ".git"))).toBe(true);
    expect(commits(dir)).toBe(0);
  });
  it("asks first, and commits only when the answer is yes", async () => {
    const declined = join(tmp(), "a");
    await runNew({
      ...base,
      dir: declined,
      partial: {},
      git: true,
      commit: "ask",
      confirm: async () => false,
    });
    expect(commits(declined)).toBe(0);
    const agreed = join(tmp(), "b");
    const confirm = vi.fn().mockResolvedValue(true);
    await runNew({ ...base, dir: agreed, partial: {}, git: true, commit: "ask", confirm });
    expect(confirm).toHaveBeenCalledOnce();
    expect(commits(agreed)).toBe(1);
  });
  it("never commits when git is off", async () => {
    const dir = join(tmp(), "a");
    await runNew({ ...base, dir, partial: {}, git: false, commit: "yes" });
    expect(existsSync(join(dir, ".git"))).toBe(false);
  });
});

describe("template mode and init", () => {
  it("template output keeps placeholders; init finishes it to match new", async () => {
    const dir = join(tmp(), "t");
    await runNew({ ...base, dir, partial: {}, templateMode: true });
    expect(existsSync(join(dir, INIT_MARKER))).toBe(true);
    expect(readFileSync(join(dir, "package.json"), "utf8")).toContain("{{PACKAGE_NAME}}");

    const partial: Partial<Answers> = {
      projectName: "Acme Portal",
      packageName: "acme-portal",
      roles: ["admin"],
      modules: ["ai", "rolecheck"],
    };
    await runInit({ cwd: dir, partial, nonInteractive: true, install: false, out: () => {} });
    expect(existsSync(join(dir, INIT_MARKER))).toBe(false);

    const reference = join(tmp(), "ref");
    await runNew({ ...base, dir: reference, partial });
    expect(readProjectFiles(dir)).toEqual(readProjectFiles(reference));
  });

  it("init fails without the marker, and cannot run twice", async () => {
    await expect(
      runInit({ cwd: tmp(), partial: {}, nonInteractive: true, install: false, out: () => {} }),
    ).rejects.toThrow(/only runs in a project/);
    const dir = join(tmp(), "t");
    await runNew({ ...base, dir, partial: {}, templateMode: true });
    await runInit({ cwd: dir, partial: {}, nonInteractive: true, install: false, out: () => {} });
    await expect(
      runInit({ cwd: dir, partial: {}, nonInteractive: true, install: false, out: () => {} }),
    ).rejects.toThrow(/marker|only runs/);
  });

  it("init fails loudly on an unknown placeholder instead of leaving a file half-filled", async () => {
    const dir = join(tmp(), "t");
    await runNew({ ...base, dir, partial: {}, templateMode: true });
    mkdirSync(join(dir, "notes"));
    writeFileSync(join(dir, "notes", "mine.md"), "{{LEAVE_ME}}");
    await expect(
      runInit({ cwd: dir, partial: {}, nonInteractive: true, install: false, out: () => {} }),
    ).rejects.toThrow(/LEAVE_ME/);
  });
});

describe("readConfig", () => {
  const write = (v: unknown) => {
    const f = join(tmp(), "answers.json");
    writeFileSync(f, typeof v === "string" ? v : JSON.stringify(v));
    return f;
  };
  it("reads known keys", () => {
    expect(readConfig(write({ projectName: "X App", roles: ["a"], modules: ["ai"] }))).toEqual({
      projectName: "X App",
      roles: ["a"],
      modules: ["ai"],
    });
  });
  it("rejects unknown keys, wrong types, non-objects and bad JSON", () => {
    expect(() => readConfig(write({ nope: 1 }))).toThrow(/unknown key/);
    expect(() => readConfig(write({ roles: "admin" }))).toThrow(/array of strings/);
    expect(() => readConfig(write({ projectName: 3 }))).toThrow(/a string/);
    expect(() => readConfig(write("[]"))).toThrow(/JSON object/);
    expect(() => readConfig(write("{nope"))).toThrow(/Could not read/);
    expect(() => readConfig("/no/such/file.json")).toThrow(/Could not read/);
  });
});

describe("main", () => {
  let log: ReturnType<typeof vi.spyOn>;
  let err: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    log = vi.spyOn(console, "log").mockImplementation(() => {});
    err = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());
  const errors = () => err.mock.calls.map((c) => String(c[0])).join("\n");

  it("prints help and the version", async () => {
    expect(await main(["--help"])).toBe(0);
    expect(String(log.mock.calls[0]?.[0])).toContain("Usage");
    expect(await main(["--version"])).toBe(0);
  });
  it("exits 2 on no command, an unknown command, an unknown flag, or missing arguments", async () => {
    expect(await main([])).toBe(2);
    expect(await main(["frobnicate"])).toBe(2);
    expect(await main(["new", "--bogus"])).toBe(2);
    expect(await main(["new", "--yes"])).toBe(2);
    expect(await main(["init", "extra", "--yes"])).toBe(2);
  });
  it("creates a project with --yes, with flags overriding --config", async () => {
    const dir = join(tmp(), "app");
    const config = join(tmp(), "a.json");
    writeFileSync(
      config,
      JSON.stringify({
        projectName: "From Config",
        packageName: "from-config",
        modules: ["crypto"],
      }),
    );
    const code = await main([
      "new",
      dir,
      "--config",
      config,
      "--name",
      "From Flag",
      "--no-install",
      "--no-git",
    ]);
    expect(code).toBe(0);
    const agents = readFileSync(join(dir, "AGENTS.md"), "utf8");
    expect(agents).toMatch(/^# From Flag$/m);
    expect(JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).name).toBe("from-config");
    expect(existsSync(join(dir, "lib", "crypto.ts"))).toBe(true);
  });
  it("reports invalid flags with exit 2 and no output directory", async () => {
    const dir = join(tmp(), "app");
    expect(await main(["new", dir, "--yes", "--no-install", "--no-git", "--modules", "nope"])).toBe(
      2,
    );
    expect(errors()).toMatch(/unknown module/);
    expect(existsSync(dir)).toBe(false);
  });
  it("knows every module id in its help", async () => {
    await main(["--help"]);
    const help = String(log.mock.calls[0]?.[0]);
    for (const id of MODULE_IDS) expect(help).toContain(id);
  });
});
