import { createHash } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runNew } from "../src/commands/new.js";
import { readProjectFiles } from "../src/fsops.js";
import { main } from "../src/main.js";

/** One hash over every path and byte of a project, so any difference at all shows up. */
function treeHash(dir: string): string {
  const h = createHash("sha256");
  for (const [path, text] of readProjectFiles(dir)) h.update(`${path}\0${text}\0`);
  return h.digest("hex");
}

const tmp = () => mkdtempSync(join(tmpdir(), "gw-det-"));
const base = {
  nonInteractive: true,
  install: false,
  git: false,
  commit: "no" as const,
  templateMode: false,
  out: () => {},
};

describe("determinism", () => {
  it("two runs with the same answers give byte-identical projects, with every module", async () => {
    const partial = {
      projectName: "Det App",
      packageName: "det-app",
      roles: ["admin", "editor"],
      modules: ["ai", "crypto", "email", "supabase-mcp", "rolecheck"] as never,
    };
    const a = join(tmp(), "a");
    const b = join(tmp(), "b");
    await runNew({ ...base, dir: a, partial });
    await runNew({ ...base, dir: b, partial });
    expect(treeHash(a)).toBe(treeHash(b));
  });

  it("the directory name alone does not change the output when answers are given", async () => {
    const partial = { projectName: "Det App", packageName: "det-app" };
    const a = join(tmp(), "first-name");
    const b = join(tmp(), "second-name");
    await runNew({ ...base, dir: a, partial });
    await runNew({ ...base, dir: b, partial });
    expect(treeHash(a)).toBe(treeHash(b));
  });

  it("template-mode output is deterministic too", async () => {
    const a = join(tmp(), "a");
    const b = join(tmp(), "b");
    await runNew({ ...base, dir: a, partial: {}, templateMode: true });
    await runNew({ ...base, dir: b, partial: {}, templateMode: true });
    expect(treeHash(a)).toBe(treeHash(b));
  });

  describe("through the command line", () => {
    beforeEach(() => {
      vi.spyOn(console, "log").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => vi.restoreAllMocks());

    it("--config runs are identical", async () => {
      const preset = fileURLToPath(new URL("../../../test/presets/full.json", import.meta.url));
      const a = join(tmp(), "a");
      const b = join(tmp(), "b");
      expect(await main(["new", a, "--config", preset, "--no-install", "--no-git"])).toBe(0);
      expect(await main(["new", b, "--config", preset, "--no-install", "--no-git"])).toBe(0);
      expect(treeHash(a)).toBe(treeHash(b));
    });
  });
});
