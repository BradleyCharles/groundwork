import { describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs without types
import { checkCommand } from "../../.claude/hooks/guard-bash.mjs";

const blocked = [
  "git commit -m 'x'",
  "git commit",
  "git push",
  "git push origin main --force",
  "git -C . commit -m x",
  "git -c user.name=a commit -m x",
  "git --no-pager commit",
  "git -C /tmp/x -c a=b push",
  "git reset --hard",
  "git reset --hard HEAD~1",
  "npm run lint && git commit -m x",
  "npm test; git push",
  "echo hi | git commit -F -",
  "FOO=bar git commit",
  "bash -c 'git commit -m x'",
  'sh -c "git push"',
  "eval 'git commit'",
  "echo $(git commit -m x)",
  "echo `git push`",
  "if true; then git commit -m x; fi",
  "supabase db push",
  "npx supabase db push",
  "npx supabase db push --linked",
  "npm install axios",
  "npm i axios",
  "npm i -D vitest",
  "npm add axios",
  "npm install --save-dev axios@1",
  "pnpm add axios",
  "yarn add axios",
  "bun add axios",
  "pnpm install axios",
  "npx -y supabase db push",
  "npm exec -- supabase db push",
  "git.exe commit",
];

const allowed = [
  "git status",
  "git diff",
  "git log --oneline -5",
  "git add -A",
  "git commit-tree abc",
  "git stash",
  "git reset --soft HEAD~1",
  "git reset HEAD file.ts",
  "npm install",
  "npm ci",
  "npm run build",
  "npm test",
  "npx supabase db reset",
  "npx supabase test db",
  "npx supabase status",
  "supabase db diff",
  "node scripts/db/generate-living-docs.mjs",
  "echo 'git commit is blocked'",
  'grep -r "git push" docs',
  "ls -la",
  "yarn install",
  "pnpm install",
  "pnpm run lint",
  "bash -c 'npm run lint'",
];

describe("guard-bash", () => {
  it.each(blocked)("blocks: %s", (cmd) => {
    expect(checkCommand(cmd)).toEqual(expect.any(String));
  });

  it.each(allowed)("allows: %s", (cmd) => {
    expect(checkCommand(cmd)).toBeNull();
  });

  it("returns an explanation the model can act on", () => {
    expect(checkCommand("git commit -m x")).toMatch(/only the user commits/);
    expect(checkCommand("npm i axios")).toMatch(/dependencies/);
  });

  it("ignores non-string input", () => {
    expect(checkCommand(undefined)).toBeNull();
    expect(checkCommand(42)).toBeNull();
  });

  it("stops recursing on deeply nested wrappers instead of hanging", () => {
    let cmd = "git commit";
    for (let i = 0; i < 10; i++) cmd = `bash -c '${cmd.replaceAll("'", "")}'`;
    expect(() => checkCommand(cmd)).not.toThrow();
  });
});
