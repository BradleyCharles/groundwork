import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  defaultAnswers,
  MODULE_IDS,
  packageNameFromDir,
  placeholderValues,
  projectNameFromPackage,
  resolveAnswers,
  validators,
} from "../src/answers.js";
import { formatJson, mergeJson } from "../src/json.js";
import { hasUnresolved, renderText, RenderError } from "../src/render.js";

const root = new URL("../../../", import.meta.url);

describe("render", () => {
  const ctx = {
    values: { NAME: "Acme $& App", PKG: "acme" },
    slots: { empty: [], some: ["- one", "- two"] },
  };

  it("replaces tokens literally, including patterns like $&", () => {
    expect(renderText("# {{NAME}} / {{PKG}}", ctx)).toBe("# Acme $& App / acme");
  });
  it("throws on an unknown placeholder or slot instead of leaving it behind", () => {
    expect(() => renderText("{{NOPE}}", ctx)).toThrow(RenderError);
    expect(() => renderText("{{slot:nope}}\n", ctx)).toThrow(/unknown slot/);
  });
  it("leaves GitHub Actions expressions and lowercase braces alone", () => {
    const t = "node: ${{ matrix.node }} and {{lower}} and {{ SPACED }}";
    expect(renderText(t, ctx)).toBe(t);
  });
  it("removes an empty slot line and fills a non-empty one", () => {
    expect(renderText("a\n{{slot:empty}}\nb\n", ctx)).toBe("a\nb\n");
    expect(renderText("a\n{{slot:some}}\nb\n", ctx)).toBe("a\n- one\n- two\nb\n");
  });
  it("slot-block also drops the following blank line when empty, and keeps it when filled", () => {
    expect(renderText("a\n\n{{slot-block:empty}}\n\nb\n", ctx)).toBe("a\n\nb\n");
    expect(renderText("a\n\n{{slot-block:some}}\n\nb\n", ctx)).toBe("a\n\n- one\n- two\n\nb\n");
  });
  it("detects unresolved placeholders", () => {
    expect(hasUnresolved("x {{PROJECT_NAME}}")).toBe(true);
    expect(hasUnresolved("x\n{{slot:a}}\n")).toBe(true);
    expect(hasUnresolved("x ${{ matrix.node }}")).toBe(false);
  });
});

describe("json", () => {
  it("merges objects deeply, concatenates arrays without duplicates, replaces scalars", () => {
    expect(mergeJson({ a: { b: 1, c: [1] }, d: "x" }, { a: { b: 2, c: [1, 2] }, e: true })).toEqual(
      { a: { b: 2, c: [1, 2] }, d: "x", e: true },
    );
  });
  it("round-trips the project's living-docs config byte for byte", () => {
    const file = readFileSync(new URL("golden/docs/living-docs.config.json", root), "utf8");
    expect(formatJson(JSON.parse(file))).toBe(file);
  });
});

describe("answers", () => {
  it("derives names from a directory", () => {
    expect(packageNameFromDir("/tmp/My Cool_App!")).toBe("my-cool-app");
    expect(packageNameFromDir("123go")).toBe("app-123go");
    expect(projectNameFromPackage("my-cool-app")).toBe("My Cool App");
  });
  it("accepts the defaults", () => {
    expect(resolveAnswers({}, "my-app").errors).toEqual([]);
  });
  it.each([
    ["projectName", { projectName: 'Bad "name"' }],
    ["projectName", { projectName: "Bad <b>" }],
    ["packageName", { packageName: "Has Caps" }],
    ["description", { description: "uses `ticks`" }],
    ["scope", { scope: "has {{token}}" }],
    ["scope", { scope: "two\nlines" }],
    ["scope", { scope: "Launch on 2027-01-15" }],
    ["scope", { scope: "Built in Phase 2" }],
    ["roles", { roles: ["Admin"] }],
    ["roles", { roles: ["a", "a"] }],
    ["modules", { modules: ["nope" as never] }],
    ["supabaseProjectRef", { supabaseProjectRef: "Bad Ref" }],
    ["packageManager", { packageManager: "pnpm" as never }],
  ])("rejects bad %s", (field, partial) => {
    const { errors } = resolveAnswers(partial, "x");
    expect(errors.some((e) => e.startsWith(field))).toBe(true);
  });
  it("accepts ordinary wording that a naive history lint would flag", () => {
    const scope = "A tool used to track orders; it no longer supports the old export.";
    expect(resolveAnswers({ scope }, "x").errors).toEqual([]);
  });
  it("accepts the scope used by the end to end presets", () => {
    expect(
      validators.scope(
        "Groundwork project with every optional module, used to verify the generator end to end.",
      ),
    ).toBeNull();
  });
  it("orders modules canonically", () => {
    expect(resolveAnswers({ modules: ["rolecheck", "ai"] }, "x").answers.modules).toEqual([
      "ai",
      "rolecheck",
    ]);
    expect(MODULE_IDS[0]).toBe("ai");
  });
  it("keeps a package name's display name in step when only the package is given", () => {
    expect(resolveAnswers({ packageName: "acme-portal" }, "x").answers.projectName).toBe(
      "Acme Portal",
    );
  });
  it("renders the no-roles line unchanged and a roles line with names", () => {
    expect(placeholderValues(defaultAnswers("x")).ROLES_LINE).toContain(
      "No role-restricted routes exist yet",
    );
    const v = placeholderValues({ ...defaultAnswers("x"), roles: ["admin", "editor"] });
    expect(v.ROLES_LINE).toContain("`admin`, `editor`");
  });
  it("validators accept the golden project's own values", () => {
    expect(validators.projectName("Groundwork App")).toBeNull();
    expect(validators.packageName("golden")).toBeNull();
    expect(validators.description("Starter application generated by groundwork.")).toBeNull();
  });
});
