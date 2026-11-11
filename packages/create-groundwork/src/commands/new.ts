import { basename, resolve } from "node:path";
import { resolveAnswers, type Answers } from "../answers.js";
import { loadAssets, resolveAssetsDir } from "../assets.js";
import { prepareTargetDir, UsageError, writePlan } from "../fsops.js";
import { buildPlan, buildTemplatePlan } from "../plan.js";
import { gitInit, initialCommit, npmInstall, renderAgentsTable } from "../post.js";

export interface NewOptions {
  dir: string;
  partial: Partial<Answers>;
  nonInteractive: boolean;
  install: boolean;
  git: boolean;
  commit: "ask" | "yes" | "no";
  templateMode: boolean;
  assetsDir?: string;
  /** Interactive hooks; injected so the command can be tested without a terminal. */
  ask?: (initial: Answers) => Promise<Answers>;
  confirm?: (message: string) => Promise<boolean>;
  out?: (line: string) => void;
}

export async function runNew(opts: NewOptions): Promise<{ dir: string; files: number }> {
  const out = opts.out ?? ((l: string) => console.log(l));
  const dir = resolve(opts.dir);
  const assets = loadAssets(opts.assetsDir ?? resolveAssetsDir());

  let plan;
  if (opts.templateMode) {
    plan = buildTemplatePlan(assets);
  } else {
    const resolved = resolveAnswers(opts.partial, basename(dir));
    if (resolved.errors.length)
      throw new UsageError(`Invalid answers:\n${resolved.errors.map((e) => `  ${e}`).join("\n")}`);
    let answers = resolved.answers;
    if (!opts.nonInteractive) {
      if (!opts.ask)
        throw new UsageError(
          "No terminal available. Use --yes (or --config) to run without prompts.",
        );
      answers = await opts.ask(answers);
      const again = resolveAnswers(answers, basename(dir));
      if (again.errors.length)
        throw new UsageError(`Invalid answers:\n${again.errors.map((e) => `  ${e}`).join("\n")}`);
      answers = again.answers;
    }
    plan = buildPlan(assets, answers);
  }

  prepareTargetDir(dir);
  writePlan(dir, plan);
  out(`Created ${plan.files.length} files in ${dir}`);

  if (!opts.templateMode) {
    const table = renderAgentsTable(dir);
    if (!table.ok) out(`Could not render the AGENTS.md table: ${table.detail}`);
  }
  if (opts.git) {
    const g = gitInit(dir);
    if (!g.ok) out(`git init failed: ${g.detail}`);
  }
  if (opts.install && !opts.templateMode) {
    out("Installing dependencies (npm ci)...");
    const i = npmInstall(dir);
    if (!i.ok)
      out(
        `npm ci failed: ${i.detail ?? "see output above"}. Run it yourself in the project directory.`,
      );
  }
  if (opts.git && opts.commit !== "no") {
    const agreed =
      opts.commit === "yes" ||
      (opts.confirm ? await opts.confirm("Create the initial commit?") : false);
    if (agreed) {
      const c = initialCommit(dir);
      out(
        c.ok
          ? "Created the initial commit."
          : `Could not create the initial commit (${c.detail ?? "unknown error"}). Commit when ready.`,
      );
    } else {
      out("Skipped the initial commit.");
    }
  }

  out(
    `\nNext steps:\n  cd ${opts.dir}${opts.templateMode ? "\n  npx create-groundwork@latest init" : opts.install ? "" : "\n  npm ci"}\n  npm run db:start      # needs Docker\n  cp .env.example .env.local   # then fill in values from \`npm run db:status\`\n  npm run dev`,
  );
  return { dir, files: plan.files.length };
}
