import { z } from "zod";

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
});

/** Public values. Safe in client code. NEXT_PUBLIC_ names must be referenced statically so Next can inline them. */
export function clientEnv() {
  return clientSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

/** Server-only values. Never import this from client code (tests/env-boundary.test.ts enforces it). */
export function serverEnv() {
  return serverSchema.parse(process.env);
}
