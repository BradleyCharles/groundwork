// Shared helpers for the living-docs scripts.
import { readFileSync } from "node:fs";

export function loadConfig(path) {
  const config = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(config.rules)) throw new Error("living-docs.config.json needs a rules array");
  for (const [i, r] of config.rules.entries()) {
    if (!Array.isArray(r.when) || !Array.isArray(r.update) || !r.change) {
      throw new Error(`rule ${i} needs "when", "change" and "update"`);
    }
  }
  return config;
}

/** Converts a glob (supports ** and *) to a RegExp. Paths use forward slashes. */
export function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      if (glob[i + 2] === "/") {
        re += "(?:.*/)?";
        i += 2;
      } else {
        re += ".*";
        i += 1;
      }
    } else if (c === "*") re += "[^/]*";
    else re += c.replace(/[.+^${}()|[\]\\?]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

export const matchesAny = (file, globs) => globs.some((g) => globToRegExp(g).test(file));

/** Returns rules whose source paths changed but none of whose doc paths did. */
export function findViolations(config, changedFiles) {
  const changed = changedFiles.map((f) => f.replaceAll("\\", "/"));
  const violations = [];
  for (const rule of config.rules) {
    const triggers = changed.filter((f) => matchesAny(f, rule.when) && !rule.update.includes(f));
    if (triggers.length === 0) continue;
    if (rule.update.some((doc) => changed.includes(doc))) continue;
    violations.push({ rule, triggers });
  }
  return violations;
}

export function renderTable(config) {
  const lines = ["| When this changes | Update | Also check |", "| --- | --- | --- |"];
  for (const r of config.rules) {
    const when = r.when.map((w) => `\`${w}\``).join(", ");
    const docs = r.update.map((u) => `\`${u}\``).join(", ");
    lines.push(`| ${r.change} (${when}) | ${docs} | ${r.alsoCheck ?? ""} |`);
  }
  return lines.join("\n");
}

export const BEGIN = "<!-- BEGIN:living-docs -->";
export const END = "<!-- END:living-docs -->";

export function replaceBlock(markdown, table) {
  const a = markdown.indexOf(BEGIN);
  const b = markdown.indexOf(END);
  if (a === -1 || b === -1 || b < a)
    throw new Error("AGENTS.md is missing the living-docs markers");
  return `${markdown.slice(0, a + BEGIN.length)}\n${table}\n${markdown.slice(b)}`;
}
