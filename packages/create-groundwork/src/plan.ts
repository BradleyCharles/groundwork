import { placeholderValues, type Answers } from "./answers.js";
import type { Assets } from "./assets.js";
import { formatJson, mergeJson } from "./json.js";
import { renderText, type RenderContext } from "./render.js";

export const INIT_MARKER = ".groundwork-init.json";

export interface Plan {
  /** Files to write, sorted by path. */
  files: { path: string; content: string }[];
  /** Files to delete (init only). */
  deletes: string[];
}

/** Every slot name any template file uses. Modules may only fill slots from this list. */
export const SLOT_NAMES = [
  "env-example",
  "agents-hard-constraints",
  "agents-security-constraints",
  "integrations-notes",
] as const;

export function slotsFor(answers: Answers, assets: Assets): Record<string, string[]> {
  const slots: Record<string, string[]> = Object.fromEntries(SLOT_NAMES.map((n) => [n, []]));
  for (const id of answers.modules) {
    const mod = assets.modules.get(id);
    if (!mod) throw new Error(`Unknown module "${id}"`);
    for (const [name, lines] of Object.entries(mod.slots)) {
      if (!(name in slots)) throw new Error(`Module "${id}" fills unknown slot "${name}"`);
      (slots[name] as string[]).push(...lines);
    }
  }
  return slots;
}

export function contextFor(answers: Answers, assets: Assets): RenderContext {
  return {
    values: placeholderValues(answers),
    slots: slotsFor(answers, assets),
  };
}

const outputPath = (templatePath: string) =>
  templatePath === "_gitignore" ? ".gitignore" : templatePath;

/** Applies every selected module's JSON merges to already-rendered files. */
function applyMerges(files: Map<string, string>, answers: Answers, assets: Assets): void {
  for (const id of answers.modules) {
    for (const [path, patch] of Object.entries(assets.modules.get(id)!.merges)) {
      const current = files.get(path);
      if (current === undefined) throw new Error(`Module "${id}" merges into missing file ${path}`);
      files.set(path, formatJson(mergeJson(JSON.parse(current), patch as never)));
    }
  }
}

function addModuleFiles(
  files: Map<string, string>,
  answers: Answers,
  assets: Assets,
  ctx: RenderContext,
): void {
  for (const id of answers.modules) {
    for (const [path, text] of assets.modules.get(id)!.files) {
      if (files.has(path)) throw new Error(`Module "${id}" would overwrite ${path}`);
      files.set(path, renderText(text, ctx, `module ${id}: ${path}`));
    }
  }
}

const toPlan = (files: Map<string, string>, deletes: string[] = []): Plan => ({
  files: [...files.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([path, content]) => ({ path, content })),
  deletes,
});

/** `new`: the full project for these answers. Pure: no disk access, same input gives the same output. */
export function buildPlan(assets: Assets, answers: Answers): Plan {
  const ctx = contextFor(answers, assets);
  const files = new Map<string, string>();
  for (const [path, text] of assets.template)
    files.set(outputPath(path), renderText(text, ctx, path));
  addModuleFiles(files, answers, assets, ctx);
  applyMerges(files, answers, assets);
  return toPlan(files);
}

/**
 * Template-repo output: placeholders and slots stay unfilled, and a marker tells `init` to finish the job.
 * Modules are chosen at init time, so none may be selected here.
 */
export function buildTemplatePlan(assets: Assets): Plan {
  const files = new Map<string, string>();
  for (const [path, text] of assets.template) files.set(outputPath(path), text);
  files.set(
    INIT_MARKER,
    JSON.stringify(
      {
        version: 1,
        note: "Run `npx create-groundwork@latest init` to finish setting up this project.",
      },
      null,
      2,
    ) + "\n",
  );
  return toPlan(files);
}

/**
 * `init`: fills placeholders and slots in an existing project's files, adds module files, and removes the
 * marker. `existing` maps project paths to text.
 */
export function buildInitPlan(
  assets: Assets,
  answers: Answers,
  existing: Map<string, string>,
): Plan {
  if (!existing.has(INIT_MARKER))
    throw new Error(
      `${INIT_MARKER} not found. \`init\` only runs in a project made from the groundwork template.`,
    );
  const ctx = contextFor(answers, assets);
  const files = new Map<string, string>();
  for (const [path, text] of existing) {
    if (path === INIT_MARKER) continue;
    files.set(path, renderText(text, ctx, path));
  }
  addModuleFiles(files, answers, assets, ctx);
  applyMerges(files, answers, assets);
  // Only rewrite files that changed.
  const changed = new Map([...files].filter(([path, content]) => existing.get(path) !== content));
  return toPlan(changed, [INIT_MARKER]);
}
