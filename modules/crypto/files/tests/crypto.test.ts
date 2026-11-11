import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { decrypt, encrypt } from "@/lib/crypto";

const key = randomBytes(32);

describe("crypto", () => {
  it("round-trips text, including non-ASCII", () => {
    for (const text of ["", "secret", "naïve café 🔐"])
      expect(decrypt(encrypt(text, key), key)).toBe(text);
  });

  it("uses a versioned prefix and a fresh IV each time", () => {
    const a = encrypt("same", key);
    const b = encrypt("same", key);
    expect(a.startsWith("v1:")).toBe(true);
    expect(a).not.toBe(b);
  });

  it("rejects tampered data, a wrong key, and an unknown version", () => {
    const sealed = encrypt("secret", key);
    const flipped = sealed.slice(0, -2) + (sealed.endsWith("A") ? "B" : "A") + sealed.slice(-1);
    expect(() => decrypt(flipped, key)).toThrow();
    expect(() => decrypt(sealed, randomBytes(32))).toThrow();
    expect(() => decrypt(sealed.replace("v1:", "v2:"), key)).toThrow(/version/);
    expect(() => decrypt("v1:AAAA", key)).toThrow(/malformed/);
  });

  it("reads the key from ENCRYPTION_KEY and never echoes it in errors", () => {
    process.env.ENCRYPTION_KEY = Buffer.from("too short").toString("base64");
    let message = "";
    try {
      encrypt("x");
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/32 bytes/);
    expect(message).not.toContain(process.env.ENCRYPTION_KEY);

    process.env.ENCRYPTION_KEY = key.toString("base64");
    expect(decrypt(encrypt("via env"))).toBe("via env");
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt("x")).toThrow(/not set/);
  });
});
