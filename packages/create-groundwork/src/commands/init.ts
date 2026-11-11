import { basename, resolve } from "node:path";
import { resolveAnswers, type Answers } from "../answers.js";
import { loadAssets, resolveAssetsDir } from "../assets.js";
import { readProjectFiles, UsageError, writePlan } from "../fsops.js";
import { buildInitPlan, INIT_MARKER } from "../plan.js";
import { npmInstall, renderAgentsTable } from "../post.js";

export interface InitOptions {
  cwd: string;
  partial: Partial<Answers>;
  nonInteractive: boolean;
  install: boolean;
  assetsDir?: string;
  ask?: (initial: Answers) => Promise<Answers>;
  out?: (line: string) => void;
}

/** Finishes a project made from the template repository: fills placeholders in place and removes the marker. */
export async function runInit(opts: InitOptions): Promise<{ changed: number }> {
  const out = opts.out ?? ((l: string) => console.log(l));
  const dir = resolve(opts.cwd);
  const existing = readProjectFiles(dir);
  if (!existing.has(INIT_MARKER))
    throw new UsageError(
      `${INIT_MARKER} not found in ${dir}. \`init\` only runs in a project made from the groundwork template repository.`,
    );

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

  const plan = buildInitPlan(loadAssets(opts.assetsDir ?? resolveAssetsDir()), answers, existing);
  writePlan(dir, plan);
  out(`Updated ${plan.files.length} file(s) and removed ${INIT_MARKER}.`);

  const table = renderAgentsTable(dir);
  if (!table.ok) out(`Could not render the AGENTS.md table: ${table.detail}`);
  if (opts.install) {
    out("Installing dependencies (npm ci)...");
    const i = npmInstall(dir);
    if (!i.ok) out(`npm ci failed: ${i.detail ?? "see output above"}. Run it yourself.`);
  }
  out(
    "\nNext steps:\n  npm run db:start      # needs Docker\n  cp .env.example .env.local   # then fill in values from `npm run db:status`\n  npm run dev\n\nReview the changes and commit them yourself.",
  );
  return { changed: plan.files.length };
}
