import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  defaultAnswers,
  DEFAULT_DESCRIPTION,
  DEFAULT_SCOPE,
  MODULE_IDS,
  resolveAnswers,
  type Answers,
} from "../src/answers.js";
import { loadAssets } from "../src/assets.js";
import { hasUnresolved } from "../src/render.js";
import {
  buildInitPlan,
  buildPlan,
  buildTemplatePlan,
  INIT_MARKER,
  TEMPLATE_README_MARKER,
  type Plan,
} from "../src/plan.js";
// @ts-expect-error plain .mjs without types
import { sourceFiles } from "../../../scripts/extract-template.mjs";

const root = new URL("../../../", import.meta.url);
const assets = loadAssets();

/** The values golden/ was built with. */
const GOLDEN: Answers = {
  ...defaultAnswers("golden"),
  projectName: "Groundwork App",
  packageName: "golden",
  description: DEFAULT_DESCRIPTION,
  scope: DEFAULT_SCOPE,
};

const asMap = (plan: Plan) => new Map(plan.files.map((f) => [f.path, f.content]));
const answers = (partial: Partial<Answers>) => {
  const r = resolveAnswers({ ...GOLDEN, ...partial }, "acme");
  expect(r.errors).toEqual([]);
  return r.answers;
};

describe("exit criterion: default output equals golden/", () => {
  const generated = asMap(buildPlan(assets, GOLDEN));
  const goldenDir = new URL("golden/", root);

  it("produces exactly the files golden/ has", () => {
    const goldenFiles: string[] = sourceFiles(fileURLToPath(goldenDir));
    expect([...generated.keys()].sort()).toEqual([...goldenFiles].sort());
  });

  it("produces byte-identical content for every file", () => {
    const different: string[] = [];
    for (const [path, content] of generated) {
      if (readFileSync(new URL(path, goldenDir), "utf8") !== content) different.push(path);
    }
    expect(different).toEqual([]);
  });
});

describe("determinism", () => {
  it("gives identical output for identical answers, including with every module", () => {
    const a = answers({ modules: [...MODULE_IDS], roles: ["admin", "editor"] });
    expect(buildPlan(assets, a)).toEqual(buildPlan(assets, a));
  });
  it("does not depend on the order modules were listed in", () => {
    const one = resolveAnswers({ ...GOLDEN, modules: ["email", "ai"] }, "x").answers;
    const two = resolveAnswers({ ...GOLDEN, modules: ["ai", "email"] }, "x").answers;
    expect(buildPlan(assets, one)).toEqual(buildPlan(assets, two));
  });
  it("lists files in sorted order", () => {
    const paths = buildPlan(assets, GOLDEN).files.map((f) => f.path);
    expect(paths).toEqual([...paths].sort());
  });
});

describe("every module combination", () => {
  const combos = Array.from({ length: 1 << MODULE_IDS.length }, (_, mask) =>
    MODULE_IDS.filter((_, i) => mask & (1 << i)),
  );
  it.each(combos.map((c) => [c.join("+") || "none", c] as const))(
    "builds cleanly with %s",
    (_label, modules) => {
      const plan = buildPlan(assets, answers({ modules: [...modules], roles: ["admin"] }));
      const paths = plan.files.map((f) => f.path);
      expect(new Set(paths).size).toBe(paths.length);
      for (const f of plan.files) {
        expect(hasUnresolved(f.content), `${f.path} has an unresolved placeholder`).toBe(false);
        if (f.path.endsWith(".json")) expect(() => JSON.parse(f.content), f.path).not.toThrow();
      }
    },
  );
});

describe("module effects", () => {
  const files = (modules: Answers["modules"], extra: Partial<Answers> = {}) =>
    asMap(buildPlan(assets, answers({ modules, ...extra })));

  it("ai adds its files, constraints, env names, doc rule and integration note", () => {
    const f = files(["ai"]);
    expect(f.has("lib/ai/models.ts")).toBe(true);
    expect(f.has("docs/technical-map/07-ai-integration.md")).toBe(true);
    expect(f.get("AGENTS.md")).toContain("Never change the model ID in `lib/ai/models.ts`");
    expect(f.get(".env.example")).toContain("ANTHROPIC_API_KEY=");
    expect(JSON.parse(f.get("docs/living-docs.config.json")!).rules.at(-1).when).toEqual([
      "lib/ai/**",
    ]);
    expect(f.get("docs/technical-map/10-integrations.md")).toContain("Anthropic API");
  });
  it("crypto adds the helper and its key name", () => {
    const f = files(["crypto"]);
    expect(f.has("lib/crypto.ts")).toBe(true);
    expect(f.get(".env.example")).toContain("ENCRYPTION_KEY=");
    expect(f.get("AGENTS.md")).toContain("lib/crypto.ts");
  });
  it("supabase-mcp is read-only and uses the project ref", () => {
    const f = files(["supabase-mcp"], { supabaseProjectRef: "abcdefghij" });
    const mcp = JSON.parse(f.get(".mcp.json")!);
    expect(mcp.mcpServers.supabase.url).toBe(
      "https://mcp.supabase.com/mcp?project_ref=abcdefghij&read_only=true",
    );
    expect(f.get("AGENTS.md")).toContain("read-only");
  });
  it("rolecheck lists the roles", () => {
    expect(files(["rolecheck"], { roles: ["admin", "editor"] }).get("rolecheck.yaml")).toContain(
      "roles:\n  - admin\n  - editor",
    );
    expect(files(["rolecheck"]).get("rolecheck.yaml")).toContain("roles: []");
  });
  it("roles appear in the permissions doc", () => {
    expect(files([], { roles: ["admin"] }).get("docs/technical-map/03-permissions.md")).toContain(
      "`admin`",
    );
  });
  it("the generated accessibility doc matches the hash recorded in ADR 0012", () => {
    const adr = readFileSync(
      new URL("docs/decisions/0012-accessibility-doc-integrity.md", root),
      "utf8",
    );
    const expected = /sha256:\s*([0-9a-f]{64})/.exec(adr)?.[1];
    const doc = files([...MODULE_IDS]).get("docs/web-accessibility-requirements.md")!;
    expect(createHash("sha256").update(doc).digest("hex")).toBe(expected);
  });
  it("modules never touch the accessibility doc", () => {
    const original = readFileSync(
      new URL("template/docs/web-accessibility-requirements.md", root),
      "utf8",
    );
    expect(files([...MODULE_IDS]).get("docs/web-accessibility-requirements.md")).toBe(original);
  });
});

describe("answers reach the right places and nothing else leaks", () => {
  const custom = asMap(
    buildPlan(
      assets,
      answers({
        projectName: "Acme Portal",
        packageName: "acme-portal",
        description: "Portal for Acme staff",
      }),
    ),
  );

  it("fills the name, package name and description", () => {
    expect(custom.get("AGENTS.md")).toMatch(/^# Acme Portal$/m);
    expect(JSON.parse(custom.get("package.json")!).name).toBe("acme-portal");
    expect(JSON.parse(custom.get("package-lock.json")!).name).toBe("acme-portal");
    expect(custom.get("supabase/config.toml")).toContain('project_id = "acme-portal"');
    expect(custom.get("app/layout.tsx")).toContain('description: "Portal for Acme staff"');
  });
  it("leaves no trace of golden's own values", () => {
    for (const [path, content] of custom) {
      expect(content, path).not.toContain("Groundwork App");
      expect(content, path).not.toContain('"golden"');
    }
  });
  it("inserts values literally, so $ patterns in the scope text are not interpreted", () => {
    const f = asMap(buildPlan(assets, answers({ scope: "Costs $& more, then $1 and $$" })));
    expect(f.get("AGENTS.md")).toContain("Costs $& more, then $1 and $$");
  });
  it("renames _gitignore to .gitignore", () => {
    const paths = buildPlan(assets, GOLDEN).files.map((f) => f.path);
    expect(paths).toContain(".gitignore");
    expect(paths).not.toContain("_gitignore");
  });
});

describe("template mode and init", () => {
  const templatePlan = buildTemplatePlan(assets);
  const existing = asMap(templatePlan);

  it("leaves placeholders and slots unfilled and adds the marker", () => {
    expect(existing.has(INIT_MARKER)).toBe(true);
    expect(existing.get("AGENTS.md")).toContain("{{PROJECT_NAME}}");
    expect(existing.get(".env.example")).toContain("{{slot:env-example}}");
  });

  it("init on the template output equals new for the same answers, with and without modules", () => {
    for (const a of [
      GOLDEN,
      answers({
        modules: [...MODULE_IDS],
        roles: ["admin", "editor"],
        projectName: "Acme Portal",
        packageName: "acme-portal",
      }),
    ]) {
      const init = buildInitPlan(assets, a, existing);
      const merged = new Map(existing);
      for (const d of init.deletes) merged.delete(d);
      for (const f of init.files) merged.set(f.path, f.content);
      expect(merged).toEqual(asMap(buildPlan(assets, a)));
    }
  });

  it("init removes the template repo's README but keeps a README the user wrote", () => {
    const withTemplateReadme = new Map(existing).set(
      "README.md",
      `${TEMPLATE_README_MARKER}\n# groundwork-template\n`,
    );
    const plan = buildInitPlan(assets, GOLDEN, withTemplateReadme);
    expect(plan.deletes).toContain("README.md");
    expect(plan.files.map((f) => f.path)).not.toContain("README.md");

    const withOwnReadme = new Map(existing).set("README.md", "# My own notes\n");
    const kept = buildInitPlan(assets, GOLDEN, withOwnReadme);
    expect(kept.deletes).not.toContain("README.md");
  });

  it("init refuses a project without the marker", () => {
    expect(() => buildInitPlan(assets, GOLDEN, new Map([["a.txt", "x"]]))).toThrow(
      /only runs in a project made from the groundwork template/,
    );
  });
});
