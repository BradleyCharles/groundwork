#!/usr/bin/env node
// Derives template/ from golden/ using scripts/template.manifest.json.
//   node scripts/extract-template.mjs           write template/
//   node scripts/extract-template.mjs --check   exit 1 if template/ differs from what would be written
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function countOccurrences(text, needle) {
  return needle ? text.split(needle).length - 1 : 0;
}

/** Applies manifest replacements and inserts to one file's text. Throws if a rule does not match as declared. */
export function transform(file, text, manifest) {
  let out = text;
  for (const r of manifest.replacements.filter((x) => x.file === file)) {
    const found = countOccurrences(out, r.from);
    if (found !== r.count) throw new Error(`${file}: expected ${r.count} match(es) of ${JSON.stringify(r.from.slice(0, 60))}, found ${found}`);
    out = out.split(r.from).join(r.to);
  }
  for (const ins of manifest.inserts.filter((x) => x.file === file)) {
    if (ins.append !== undefined) {
      out = out.endsWith("\n") ? out + ins.append : `${out}\n${ins.append}`;
    } else if (ins.after !== undefined) {
      if (countOccurrences(out, ins.after) !== 1) throw new Error(`${file}: insert anchor not found exactly once: ${JSON.stringify(ins.after.slice(0, 60))}`);
      out = out.replace(ins.after, () => ins.after + ins.insert);
    } else if (ins.before !== undefined) {
      if (countOccurrences(out, ins.before) !== 1) throw new Error(`${file}: insert anchor not found exactly once: ${JSON.stringify(ins.before.slice(0, 60))}`);
      out = out.replace(ins.before, () => ins.insert + ins.before);
    }
  }
  return out;
}

/** Files of the source project: tracked plus untracked-but-not-ignored, sorted, forward slashes. */
export function sourceFiles(sourceDir) {
  const out = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", "."], { cwd: sourceDir, encoding: "utf8" });
  return out.split("\0").filter(Boolean).sort();
}

export function buildTemplate(root = ROOT) {
  const manifest = JSON.parse(readFileSync(join(root, "scripts", "template.manifest.json"), "utf8"));
  const sourceDir = join(root, manifest.source);
  const files = new Map();
  for (const file of sourceFiles(sourceDir)) {
    if (manifest.preserve.includes(file)) continue;
    const target = manifest.rename[file] ?? file;
    files.set(target, transform(file, readFileSync(join(sourceDir, file), "utf8"), manifest));
  }
  // Every rule must have matched a file that exists.
  for (const rule of [...manifest.replacements, ...manifest.inserts]) {
    if (!existsSync(join(sourceDir, rule.file))) throw new Error(`manifest refers to missing file ${rule.file}`);
  }
  return { manifest, files };
}

function listTarget(dir, base = dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? listTarget(p, base) : [relative(base, p).split(sep).join("/")];
  });
}

function main() {
  const { manifest, files } = buildTemplate();
  const targetDir = join(ROOT, manifest.target);
  const existing = existsSync(targetDir) ? listTarget(targetDir).filter((f) => !manifest.preserve.includes(f)) : [];

  if (process.argv.includes("--check")) {
    const problems = [];
    for (const [file, text] of files) {
      const p = join(targetDir, file);
      if (!existsSync(p)) problems.push(`missing: ${file}`);
      else if (readFileSync(p, "utf8") !== text) problems.push(`differs: ${file}`);
    }
    for (const f of existing) if (!files.has(f)) problems.push(`stale: ${f}`);
    if (problems.length) {
      console.error(`template/ is out of date with golden/:\n${problems.map((p) => `  ${p}`).join("\n")}\nRun: node scripts/extract-template.mjs`);
      process.exit(1);
    }
    console.log(`template/ matches golden/ (${files.size} files).`);
    return;
  }

  for (const f of existing) rmSync(join(targetDir, f), { force: true });
  for (const [file, text] of files) {
    const p = join(targetDir, file);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, text);
  }
  // Remove directories left empty by the cleanup.
  const prune = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        prune(p);
        if (readdirSync(p).length === 0) rmSync(p, { recursive: true });
      }
    }
  };
  prune(targetDir);
  console.log(`Wrote ${files.size} files to ${manifest.target}/`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
