import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { EmailError, sendEmail } from "@/lib/email/client";
import { html, welcomeEmail } from "@/lib/email/templates";

beforeEach(() => {
  process.env.RESEND_API_KEY = "test-key";
  process.env.EMAIL_FROM = "App <app@example.test>";
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("templates", () => {
  it("escapes every interpolated value", () => {
    expect(html`<p>${"<script>alert(1)</script>"}</p>`).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    );
    expect(welcomeEmail('"><img src=x onerror=1>').html).not.toContain("<img");
  });
  it("leaves the template's own markup alone", () => {
    expect(html`<b>${1}</b>`).toBe("<b>1</b>");
  });
});

describe("sendEmail", () => {
  const msg = { to: "a@example.test", subject: "Hi", html: "<p>x</p>" };

  it("posts only the named fields with a bearer key and a timeout", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    await sendEmail(msg, fetchImpl);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer test-key");
    expect(JSON.parse(init.body as string)).toEqual({
      from: "App <app@example.test>",
      to: ["a@example.test"],
      subject: "Hi",
      html: "<p>x</p>",
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects extra fields and bad addresses before any request", async () => {
    const fetchImpl = vi.fn();
    await expect(
      sendEmail({ ...msg, bcc: "x@example.test" } as never, fetchImpl),
    ).rejects.toMatchObject({ status: 400 });
    await expect(sendEmail({ ...msg, to: "not-an-email" }, fetchImpl)).rejects.toMatchObject({
      status: 400,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps timeouts to 504, failures to 502, and hides the upstream body", async () => {
    await expect(
      sendEmail(msg, vi.fn().mockRejectedValue(new DOMException("t", "TimeoutError"))),
    ).rejects.toMatchObject({ status: 504 });
    const err = await sendEmail(
      msg,
      vi.fn().mockResolvedValue(new Response("private detail", { status: 422 })),
    ).catch((e) => e);
    expect(err).toBeInstanceOf(EmailError);
    expect(err.status).toBe(502);
    expect(err.message).not.toMatch(/private/);
  });

  it("fails closed without configuration", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(sendEmail(msg, vi.fn())).rejects.toMatchObject({
      status: 502,
    });
  });
});
