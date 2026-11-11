import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MODULE_IDS, resolveAnswers } from "../src/answers.js";
import { loadAssets } from "../src/assets.js";
import { buildPlan } from "../src/plan.js";
import { readConfig } from "../src/main.js";

const dir = fileURLToPath(new URL("../../../test/presets/", import.meta.url));
const presets = readdirSync(dir).filter((f) => f.endsWith(".json"));

describe("end to end presets", () => {
  it("has the three presets the workflows use", () => {
    expect(presets.sort()).toEqual(["full.json", "minimal.json", "template.json"]);
  });

  it.each(["minimal.json", "full.json"])(
    "%s is a valid config that generates a project",
    (file) => {
      const partial = readConfig(`${dir}${file}`);
      const { answers, errors } = resolveAnswers(partial, "e2e-app");
      expect(errors).toEqual([]);
      expect(buildPlan(loadAssets(), answers).files.length).toBeGreaterThan(90);
    },
  );

  it("full enables every module, so the end to end run covers all of them", () => {
    expect(readConfig(`${dir}full.json`).modules).toEqual([...MODULE_IDS]);
  });

  it("minimal enables none", () => {
    expect(readConfig(`${dir}minimal.json`).modules).toEqual([]);
  });
});
