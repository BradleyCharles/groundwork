/** Returns only the named keys. Client bodies are never spread into downstream calls. */
export function pickAllowed<T extends Record<string, unknown>, K extends keyof T>(
  body: T,
  allowed: readonly K[],
): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const key of allowed) {
    if (Object.hasOwn(body, key)) out[key] = body[key];
  }
  return out;
}
