import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AiError, callModel } from "@/lib/ai/client";
import { MODEL_ID } from "@/lib/ai/models";

const ok = (text: string) =>
  new Response(JSON.stringify({ content: [{ type: "text", text }] }), {
    status: 200,
  });

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("callModel", () => {
  it("sends only allowed fields and the configured model", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok("hello"));
    const text = await callModel(
      { messages: [{ role: "user", content: "hi" }], maxTokens: 50 },
      fetchImpl,
    );
    expect(text).toBe("hello");
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(JSON.parse(init.body as string)).toEqual({
      model: MODEL_ID,
      max_tokens: 50,
      messages: [{ role: "user", content: "hi" }],
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects fields that are not on the allowlist instead of forwarding them", async () => {
    const fetchImpl = vi.fn();
    const bad = {
      messages: [{ role: "user", content: "hi" }],
      model: "other-model",
    } as never;
    await expect(callModel(bad, fetchImpl)).rejects.toMatchObject({
      status: 400,
    });
    const roleBad = { messages: [{ role: "system", content: "x" }] } as never;
    await expect(callModel(roleBad, fetchImpl)).rejects.toMatchObject({
      status: 400,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps a timeout to 504 and other failures to 502", async () => {
    const timeout = vi.fn().mockRejectedValue(new DOMException("t", "TimeoutError"));
    await expect(
      callModel({ messages: [{ role: "user", content: "hi" }] }, timeout),
    ).rejects.toMatchObject({ status: 504 });
    const net = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    await expect(
      callModel({ messages: [{ role: "user", content: "hi" }] }, net),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("never leaks the upstream body", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("secret upstream detail", { status: 500 }));
    const err = await callModel({ messages: [{ role: "user", content: "hi" }] }, fetchImpl).catch(
      (e) => e,
    );
    expect(err).toBeInstanceOf(AiError);
    expect(err.message).not.toMatch(/secret/);
  });

  it("fails closed without a key", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(
      callModel({ messages: [{ role: "user", content: "hi" }] }, vi.fn()),
    ).rejects.toMatchObject({ status: 502 });
  });
});

describe("model ID", () => {
  it("is named only in lib/ai/models.ts", () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (["node_modules", ".next", "tests", "docs", ".git"].includes(name)) continue;
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (
          /\.(ts|tsx)$/.test(name) &&
          /claude-[a-z0-9-]+/.test(readFileSync(p, "utf8")) &&
          !p.endsWith(join("lib", "ai", "models.ts"))
        )
          hits.push(p);
      }
    };
    walk(process.cwd());
    expect(hits).toEqual([]);
  });
});
