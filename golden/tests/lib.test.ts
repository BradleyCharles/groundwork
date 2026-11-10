import { describe, expect, it } from "vitest";
import { escapeHtml } from "@/lib/escapeHtml";
import { pickAllowed } from "@/lib/validation/pick";
import { MemoryRateLimitStore, isLimited, clientIp } from "@/lib/rateLimit";
import { buildCsp, isPublicPath } from "@/proxy";

describe("pickAllowed", () => {
  it("drops keys that are not allowed", () => {
    expect(pickAllowed({ a: 1, role: "admin" }, ["a"])).toEqual({ a: 1 });
  });
});

describe("escapeHtml", () => {
  it("escapes markup", () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  });
});

describe("rate limit", () => {
  it("limits after the threshold", async () => {
    const store = new MemoryRateLimitStore();
    expect(await isLimited(store, "k", 2, 1000)).toBe(false);
    expect(await isLimited(store, "k", 2, 1000)).toBe(false);
    expect(await isLimited(store, "k", 2, 1000)).toBe(true);
  });
  it("ignores spoofable headers unless a trusted header is configured", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4" });
    expect(clientIp(h, undefined)).toBe("unknown");
    expect(clientIp(h, "x-forwarded-for")).toBe("1.2.3.4");
  });
});

describe("proxy", () => {
  it("matches public paths on a / boundary", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/login/reset")).toBe(true);
    expect(isPublicPath("/login-admin")).toBe(false);
    expect(isPublicPath("/api/profile")).toBe(false);
  });
  it("builds a nonce CSP without unsafe-inline in production", () => {
    const csp = buildCsp("abc", false);
    expect(csp).toContain("'nonce-abc'");
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});
