import * as p from "@clack/prompts";
import { MODULE_IDS, MODULE_INFO, validators, type Answers, type ModuleId } from "./answers.js";

export class CancelError extends Error {}

function unwrap<T>(value: T): Exclude<T, symbol> {
  if (p.isCancel(value)) {
    p.cancel("Cancelled. Nothing was written.");
    throw new CancelError();
  }
  return value as Exclude<T, symbol>;
}

const validate = (fn: (v: string) => string | null) => (v: string | undefined) =>
  fn(v ?? "") ?? undefined;

/** Asks every question, using `initial` (defaults, config and flags) as the starting values. */
export async function askAnswers(initial: Answers): Promise<Answers> {
  p.intro("create-groundwork");

  const projectName = unwrap(
    await p.text({
      message: "Project name",
      initialValue: initial.projectName,
      validate: validate(validators.projectName),
    }),
  );
  const packageName = unwrap(
    await p.text({
      message: "Package name (lowercase, used in package.json and Supabase)",
      initialValue: initial.packageName,
      validate: validate(validators.packageName),
    }),
  );
  const description = unwrap(
    await p.text({
      message: "Short description",
      initialValue: initial.description,
      validate: validate(validators.description),
    }),
  );
  const scope = unwrap(
    await p.text({
      message: "Scope statement (goes at the top of AGENTS.md)",
      initialValue: initial.scope,
      validate: validate(validators.scope),
    }),
  );
  const rolesText = unwrap(
    await p.text({
      message: "Roles, comma separated (leave empty for none)",
      initialValue: initial.roles.join(", "),
      validate: (v) => {
        const roles = splitList(v ?? "");
        return (
          roles.map(validators.role).find(Boolean) ??
          (new Set(roles).size === roles.length ? undefined : "Duplicate role")
        );
      },
    }),
  );
  const modules = unwrap(
    await p.multiselect<ModuleId>({
      message: "Optional modules",
      options: MODULE_IDS.map((id) => ({
        value: id,
        label: MODULE_INFO[id].title,
        hint: MODULE_INFO[id].hint,
      })),
      initialValues: initial.modules,
      required: false,
    }),
  );
  let supabaseProjectRef = initial.supabaseProjectRef;
  if (modules.includes("supabase-mcp")) {
    supabaseProjectRef = unwrap(
      await p.text({
        message: "Supabase project ref for the MCP server",
        initialValue: initial.supabaseProjectRef,
        validate: validate(validators.supabaseProjectRef),
      }),
    );
  }
  p.log.info("Package manager: npm (the only one supported in this version).");

  return {
    projectName,
    packageName,
    description,
    scope,
    roles: splitList(rolesText),
    modules,
    packageManager: "npm",
    supabaseProjectRef,
  };
}

export async function confirm(message: string, initialValue = true): Promise<boolean> {
  return unwrap(await p.confirm({ message, initialValue }));
}

export const splitList = (v: string): string[] =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
export const log = p.log;
export const outro = p.outro;
