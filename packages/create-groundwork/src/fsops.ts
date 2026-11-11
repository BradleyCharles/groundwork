import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import type { Plan } from "./plan.js";

export class UsageError extends Error {}

/** The target must not exist, or must be an empty directory. Nothing is ever overwritten. */
export function prepareTargetDir(dir: string): void {
  if (existsSync(dir)) {
    if (!statSync(dir).isDirectory()) throw new UsageError(`${dir} exists and is not a directory`);
    if (readdirSync(dir).length > 0)
      throw new UsageError(
        `${dir} is not empty. Choose a new directory, or use \`init\` inside a project made from the template.`,
      );
  } else {
    mkdirSync(dir, { recursive: true });
  }
}

export function writePlan(dir: string, plan: Plan): void {
  const root = resolve(dir);
  const inside = (p: string) => {
    const full = resolve(root, p);
    // A plan path must stay inside the project directory.
    if (full !== root && !full.startsWith(root + sep))
      throw new Error(`Refusing to write outside the project: ${p}`);
    return full;
  };
  for (const f of plan.files) {
    const full = inside(f.path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, f.content);
  }
  for (const d of plan.deletes) rmSync(inside(d), { force: true });
}

const SKIP = new Set(["node_modules", ".git", ".next"]);

/** Text files of an existing project, keyed by forward-slash path. Binary files are skipped. */
export function readProjectFiles(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  const visit = (d: string) => {
    for (const name of readdirSync(d).sort()) {
      if (SKIP.has(name)) continue;
      const p = join(d, name);
      if (statSync(p).isDirectory()) visit(p);
      else {
        const buf = readFileSync(p);
        if (!buf.includes(0)) out.set(relative(dir, p).split(sep).join("/"), buf.toString("utf8"));
      }
    }
  };
  visit(dir);
  return out;
}
