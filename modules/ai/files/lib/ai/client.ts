import "server-only";
import { z } from "zod";
import { MODEL_ID } from "@/lib/ai/models";

export const AI_TIMEOUT_MS = 30_000;
const API_URL = "https://api.anthropic.com/v1/messages";

/** Only these fields ever reach the model API. Unknown fields are rejected, never forwarded. */
export const modelRequestSchema = z
  .object({
    system: z.string().max(20_000).optional(),
    messages: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().min(1).max(100_000),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    maxTokens: z.number().int().min(1).max(8192).default(1024),
  })
  .strict();

export type ModelRequest = z.input<typeof modelRequestSchema>;

/** Status is what a route should return; the message is safe to show to a client. */
export class AiError extends Error {
  constructor(
    readonly status: 400 | 502 | 504,
    message: string,
  ) {
    super(message);
  }
}

const responseSchema = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
});

export async function callModel(
  input: ModelRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const parsed = modelRequestSchema.safeParse(input);
  if (!parsed.success) throw new AiError(400, "Invalid model request");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[ai] ANTHROPIC_API_KEY is not set");
    throw new AiError(502, "AI is not available");
  }

  let res: Response;
  try {
    res = await fetchImpl(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL_ID,
        max_tokens: parsed.data.maxTokens,
        ...(parsed.data.system ? { system: parsed.data.system } : {}),
        messages: parsed.data.messages,
      }),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut =
      error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    console.error("[ai] request failed:", timedOut ? "timeout" : "network error");
    throw new AiError(
      timedOut ? 504 : 502,
      timedOut ? "AI request timed out" : "AI is not available",
    );
  }

  if (!res.ok) {
    // Log the status only. The upstream body can contain details that must not reach a client.
    console.error("[ai] upstream returned", res.status);
    throw new AiError(502, "AI is not available");
  }

  const body = responseSchema.safeParse(await res.json().catch(() => null));
  if (!body.success) throw new AiError(502, "AI is not available");
  return body.data.content
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("");
}
