export interface RateLimitStore {
  /** Increments the counter for key and returns the count within the current window. */
  hit(key: string, windowMs: number): Promise<number>;
}

/** Per-instance only. On serverless hosts each instance has its own counters; plug in a shared store for real limits. */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly entries = new Map<string, { count: number; resetAt: number }>();

  async hit(key: string, windowMs: number): Promise<number> {
    const now = Date.now();
    const entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) {
      this.entries.set(key, { count: 1, resetAt: now + windowMs });
      return 1;
    }
    entry.count += 1;
    return entry.count;
  }
}

/** Client IP extraction depends on the host. Set TRUSTED_IP_HEADER to the header your platform guarantees. */
export function clientIp(headers: Headers, trustedHeader = process.env.TRUSTED_IP_HEADER): string {
  if (!trustedHeader) return "unknown";
  return headers.get(trustedHeader)?.split(",")[0]?.trim() || "unknown";
}

export async function isLimited(
  store: RateLimitStore,
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  return (await store.hit(key, windowMs)) > limit;
}
