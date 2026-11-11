import "server-only";
import { z } from "zod";

export const EMAIL_TIMEOUT_MS = 10_000;
const API_URL = "https://api.resend.com/emails";

export const emailSchema = z
  .object({
    to: z.email(),
    subject: z.string().min(1).max(200),
    html: z.string().min(1).max(200_000),
  })
  .strict();

export type EmailInput = z.infer<typeof emailSchema>;

/** Status is what a route should return; the message is safe to show to a client. */
export class EmailError extends Error {
  constructor(
    readonly status: 400 | 502 | 504,
    message: string,
  ) {
    super(message);
  }
}

export async function sendEmail(input: EmailInput, fetchImpl: typeof fetch = fetch): Promise<void> {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) throw new EmailError(400, "Invalid email");

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.error("[email] RESEND_API_KEY or EMAIL_FROM is not set");
    throw new EmailError(502, "Email is not available");
  }

  let res: Response;
  try {
    res = await fetchImpl(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [parsed.data.to],
        subject: parsed.data.subject,
        html: parsed.data.html,
      }),
      signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut =
      error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    console.error("[email] request failed:", timedOut ? "timeout" : "network error");
    throw new EmailError(
      timedOut ? 504 : 502,
      timedOut ? "Email request timed out" : "Email is not available",
    );
  }

  if (!res.ok) {
    console.error("[email] upstream returned", res.status);
    throw new EmailError(502, "Email is not available");
  }
}
