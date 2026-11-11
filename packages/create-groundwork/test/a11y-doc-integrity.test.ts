import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../../../", import.meta.url);

describe("accessibility requirements doc", () => {
  it("matches the SHA-256 recorded in ADR 0012", () => {
    const adr = readFileSync(
      new URL("docs/decisions/0012-accessibility-doc-integrity.md", root),
      "utf8",
    );
    const expected = /sha256:\s*([0-9a-f]{64})/.exec(adr)?.[1];
    const doc = readFileSync(new URL("template/docs/web-accessibility-requirements.md", root));
    expect(createHash("sha256").update(doc).digest("hex")).toBe(expected);
  });
});
