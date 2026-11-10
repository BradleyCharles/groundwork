import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const claude = join(process.cwd(), ".claude");
const settings = JSON.parse(readFileSync(join(claude, "settings.json"), "utf8"));

function frontmatter(path: string): Record<string, string> {
  const m = /^---\n([\s\S]*?)\n---/.exec(readFileSync(path, "utf8"));
  if (!m) throw new Error(`${path} has no frontmatter`);
  return Object.fromEntries(
    (m[1] as string).split("\n").map((l) => {
      const i = l.indexOf(":");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
  );
}

describe(".claude/settings.json", () => {
  const commands: string[] = Object.values(settings.hooks)
    .flat()
    .flatMap((g) => (g as { hooks: { command: string }[] }).hooks.map((h) => h.command));

  it("registers at most five hooks", () => {
    expect(commands.length).toBeLessThanOrEqual(5);
  });

  it("points every hook at a script that exists", () => {
    for (const cmd of commands) {
      const file = /\.claude\/hooks\/([\w-]+\.mjs)/.exec(cmd)?.[1];
      expect(file, cmd).toBeDefined();
      expect(existsSync(join(claude, "hooks", file as string)), cmd).toBe(true);
    }
  });

  it("denies commits, pushes, env files, and generated schema edits", () => {
    const deny: string[] = settings.permissions.deny;
    for (const rule of [
      "Bash(git commit *)",
      "Bash(git push *)",
      "Read(./.env*)",
      "Edit(./supabase/schema.sql)",
      "Edit(./supabase/policies.sql)",
    ]) {
      expect(deny).toContain(rule);
    }
  });

  it("never allows commit or push", () => {
    const allow: string[] = settings.permissions.allow;
    expect(allow.filter((r) => /git (commit|push)/.test(r))).toEqual([]);
  });
});

describe("subagents", () => {
  const dir = join(claude, "agents");
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));

  it("has the four reviewers", () => {
    expect(files.sort()).toEqual([
      "a11y-reviewer.md",
      "db-reviewer.md",
      "docs-steward.md",
      "security-reviewer.md",
    ]);
  });

  it.each(files)("%s is read-only and well formed", (file) => {
    const fm = frontmatter(join(dir, file));
    expect(fm.name).toBe(file.replace(/\.md$/, ""));
    expect(fm.description?.length).toBeGreaterThan(20);
    expect(fm.model).toBeTruthy();
    const tools = (fm.tools ?? "").split(",").map((t) => t.trim());
    expect(tools.filter((t) => ["Edit", "Write", "MultiEdit", "NotebookEdit"].includes(t))).toEqual(
      [],
    );
    // Only docs-steward may use Bash, and its prompt must restrict it to read-only git.
    if (tools.includes("Bash")) {
      expect(file).toBe("docs-steward.md");
      expect(readFileSync(join(dir, file), "utf8")).toMatch(/nothing else/);
    }
  });
});

describe("skills", () => {
  const dir = join(claude, "skills");
  const names = readdirSync(dir);

  it("has the four procedures", () => {
    expect(names.sort()).toEqual([
      "db-change",
      "feature-spec",
      "security-audit",
      "session-handoff",
    ]);
  });

  it.each(names)("%s has a SKILL.md with matching name and description", (name) => {
    const fm = frontmatter(join(dir, name, "SKILL.md"));
    expect(fm.name).toBe(name);
    expect(fm.description?.length).toBeGreaterThan(20);
  });

  it("every skill tells the agent not to commit", () => {
    for (const name of names) {
      const body = readFileSync(join(dir, name, "SKILL.md"), "utf8");
      if (name === "feature-spec") continue;
      expect(body, name).toMatch(/not commit|do not commit|Do not commit/i);
    }
  });
});
