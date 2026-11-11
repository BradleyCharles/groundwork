import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { MODULE_IDS, type ModuleId } from "./answers.js";

export interface ModuleDef {
  id: ModuleId;
  title: string;
  slots: Record<string, string[]>;
  merges: Record<string, unknown>;
  files: Map<string, string>;
}

export interface Assets {
  /** Template files keyed by path inside the template (`_gitignore` is renamed on output). */
  template: Map<string, string>;
  modules: Map<ModuleId, ModuleDef>;
}

/** Where template/ and modules/ live: bundled next to the built CLI, or the repo root when run from source. */
export function resolveAssetsDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.env.GROUNDWORK_ASSETS,
    join(here, "assets"),
    join(here, "..", "..", ".."),
  ].filter((c): c is string => Boolean(c));
  for (const c of candidates)
    if (existsSync(join(c, "template")) && existsSync(join(c, "modules"))) return c;
  throw new Error(`Could not find the template files. Looked in: ${candidates.join(", ")}`);
}

export function walkFiles(dir: string): string[] {
  const out: string[] = [];
  const visit = (d: string) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) visit(p);
      else out.push(relative(dir, p).split(sep).join("/"));
    }
  };
  visit(dir);
  return out;
}

function readTree(dir: string): Map<string, string> {
  return new Map(walkFiles(dir).map((f) => [f, readFileSync(join(dir, f), "utf8")]));
}

export function loadAssets(assetsDir = resolveAssetsDir()): Assets {
  const modules = new Map<ModuleId, ModuleDef>();
  for (const id of MODULE_IDS) {
    const dir = join(assetsDir, "modules", id);
    if (!existsSync(join(dir, "module.json")))
      throw new Error(`Module "${id}" is missing module.json`);
    const def = JSON.parse(readFileSync(join(dir, "module.json"), "utf8")) as {
      id: string;
      title: string;
      slots?: Record<string, string[]>;
      merges?: Record<string, unknown>;
    };
    if (def.id !== id) throw new Error(`Module folder "${id}" declares id "${def.id}"`);
    const filesDir = join(dir, "files");
    modules.set(id, {
      id,
      title: def.title,
      slots: def.slots ?? {},
      merges: def.merges ?? {},
      files: existsSync(filesDir) ? readTree(filesDir) : new Map(),
    });
  }
  return { template: readTree(join(assetsDir, "template")), modules };
}
