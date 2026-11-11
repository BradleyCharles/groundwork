import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { MODULE_IDS, type Answers } from "./answers.js";
import { runInit } from "./commands/init.js";
import { runNew } from "./commands/new.js";
import { UsageError } from "./fsops.js";
import { VERSION } from "./version.js";

const HELP = `create-groundwork ${VERSION}
Scaffold a Next.js + Supabase project with a security baseline, accessibility checks,
living docs, and a coding-agent setup.

Usage
  create-groundwork new <directory> [options]    create a project in a new directory
  create-groundwork init [options]               finish a project made from the template repository

Options
  -y, --yes                     use defaults and flags without prompting
      --config <file>           read answers from a JSON file (also runs without prompting)
      --name <text>             project name
      --package-name <text>     package name (lowercase, hyphens)
      --description <text>      short description
      --scope <text>            scope statement for AGENTS.md
      --roles <a,b>             role names
      --modules <a,b>           optional modules: ${MODULE_IDS.join(", ")}
      --supabase-project-ref <ref>   project ref for the supabase-mcp module
      --no-install              skip npm ci
      --no-git                  skip git init
      --no-commit               never create the initial commit
      --template-mode           (new) leave placeholders unfilled and add the init marker
  -h, --help                    show this help
  -v, --version                 show the version

Flags override --config, which overrides the defaults. The tool only ever makes the initial
commit, and asks first unless --yes is given.`;

const ANSWER_KEYS: Record<keyof Answers, "string" | "string[]"> = {
  projectName: "string",
  packageName: "string",
  description: "string",
  scope: "string",
  roles: "string[]",
  modules: "string[]",
  packageManager: "string",
  supabaseProjectRef: "string",
};

export function readConfig(path: string): Partial<Answers> {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new UsageError(`Could not read ${path}: ${(e as Error).message}`);
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw))
    throw new UsageError(`${path} must contain a JSON object`);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const kind = ANSWER_KEYS[key as keyof Answers];
    if (!kind)
      throw new UsageError(
        `${path}: unknown key "${key}" (known: ${Object.keys(ANSWER_KEYS).join(", ")})`,
      );
    const ok =
      kind === "string"
        ? typeof value === "string"
        : Array.isArray(value) && value.every((v) => typeof v === "string");
    if (!ok)
      throw new UsageError(
        `${path}: "${key}" must be ${kind === "string" ? "a string" : "an array of strings"}`,
      );
    out[key] = value;
  }
  return out as Partial<Answers>;
}

const list = (v: string | undefined) =>
  v === undefined
    ? undefined
    : v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

export async function main(argv: string[]): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        yes: { type: "boolean", short: "y" },
        config: { type: "string" },
        name: { type: "string" },
        "package-name": { type: "string" },
        description: { type: "string" },
        scope: { type: "string" },
        roles: { type: "string" },
        modules: { type: "string" },
        "supabase-project-ref": { type: "string" },
        "no-install": { type: "boolean" },
        "no-git": { type: "boolean" },
        "no-commit": { type: "boolean" },
        "template-mode": { type: "boolean" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    });
  } catch (e) {
    console.error(`${(e as Error).message}\n\nRun with --help for usage.`);
    return 2;
  }
  const { values, positionals } = parsed;
  if (values.version) {
    console.log(VERSION);
    return 0;
  }
  if (values.help || positionals.length === 0) {
    console.log(HELP);
    return values.help ? 0 : 2;
  }

  const [command, ...rest] = positionals;
  try {
    const partial: Partial<Answers> = {
      ...(values.config ? readConfig(values.config) : {}),
      ...(values.name !== undefined && { projectName: values.name }),
      ...(values["package-name"] !== undefined && { packageName: values["package-name"] }),
      ...(values.description !== undefined && { description: values.description }),
      ...(values.scope !== undefined && { scope: values.scope }),
      ...(values.roles !== undefined && { roles: list(values.roles) }),
      ...(values.modules !== undefined && { modules: list(values.modules) as Answers["modules"] }),
      ...(values["supabase-project-ref"] !== undefined && {
        supabaseProjectRef: values["supabase-project-ref"],
      }),
    };
    const nonInteractive = Boolean(values.yes || values.config);
    if (!nonInteractive && !process.stdin.isTTY)
      throw new UsageError(
        "No terminal available. Use --yes (or --config) to run without prompts.",
      );
    const prompts = nonInteractive ? undefined : await import("./prompts.js");

    if (command === "new") {
      if (rest.length !== 1) throw new UsageError("Usage: create-groundwork new <directory>");
      await runNew({
        dir: rest[0] as string,
        partial,
        nonInteractive,
        install: !values["no-install"],
        git: !values["no-git"],
        commit: values["no-commit"] ? "no" : values.yes || values.config ? "yes" : "ask",
        templateMode: Boolean(values["template-mode"]),
        ask: prompts?.askAnswers,
        confirm: prompts?.confirm,
      });
      return 0;
    }
    if (command === "init") {
      if (rest.length !== 0) throw new UsageError("Usage: create-groundwork init");
      await runInit({
        cwd: process.cwd(),
        partial,
        nonInteractive,
        install: !values["no-install"],
        ask: prompts?.askAnswers,
      });
      return 0;
    }
    throw new UsageError(`Unknown command "${command}". Use "new" or "init".`);
  } catch (e) {
    if (e instanceof UsageError) {
      console.error(e.message);
      return 2;
    }
    if (e instanceof Error && e.constructor.name === "CancelError") return 130;
    console.error(e instanceof Error ? e.message : e);
    return 1;
  }
}
