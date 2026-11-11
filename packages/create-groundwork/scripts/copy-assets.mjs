// Copies template/ and modules/ from the repo root into dist/assets so the published CLI is self-contained.
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");
const out = join(here, "..", "dist", "assets");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const dir of ["template", "modules"])
  cpSync(join(root, dir), join(out, dir), { recursive: true });
console.log("Copied template/ and modules/ into dist/assets/");
