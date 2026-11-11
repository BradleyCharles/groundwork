import { describe, expect, it } from "vitest";
import { defaultAnswers, MODULE_IDS, resolveAnswers } from "../src/answers.js";
import { loadAssets } from "../src/assets.js";
import { buildPlan } from "../src/plan.js";

const assets = loadAssets();

function paths(modules: readonly (typeof MODULE_IDS)[number][]): string[] {
  const { answers, errors } = resolveAnswers(
    { ...defaultAnswers("snapshot-app"), modules: [...modules], roles: ["admin"] },
    "snapshot-app",
  );
  expect(errors).toEqual([]);
  return buildPlan(assets, answers).files.map((f) => f.path);
}

const combos = Array.from({ length: 1 << MODULE_IDS.length }, (_, mask) =>
  MODULE_IDS.filter((_, i) => mask & (1 << i)),
);
const label = (c: readonly string[]) => (c.length ? c.join("+") : "none");

describe("generated file tree, every module combination", () => {
  const base = paths([]);

  it("base tree (no modules)", () => {
    expect(base).toMatchSnapshot();
  });

  it("each combination adds only its modules' files and removes nothing", () => {
    const added: Record<string, string[]> = {};
    for (const combo of combos) {
      const p = paths(combo);
      for (const f of base) expect(p, `${label(combo)} lost ${f}`).toContain(f);
      added[label(combo)] = p.filter((f) => !base.includes(f));
    }
    expect(added).toMatchSnapshot();
  });

  it("each module's added files are exactly its own file list", () => {
    for (const id of MODULE_IDS) {
      const own = [...(assets.modules.get(id)?.files.keys() ?? [])].sort();
      expect(paths([id]).filter((f) => !base.includes(f))).toEqual(own);
    }
  });

  it("combining modules adds the union of their files", () => {
    const union = new Set(MODULE_IDS.flatMap((id) => paths([id]).filter((f) => !base.includes(f))));
    expect(paths(MODULE_IDS).filter((f) => !base.includes(f))).toEqual([...union].sort());
  });
});
