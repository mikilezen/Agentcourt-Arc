type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export type RateLimitConfig = {
  /** Maximum number of requests in the window */
  maxRequests: number;
  /** Window size in seconds */
  windowSeconds: number;
};

export const RATE_LIMITS = {
  /** General API reads */
  read: { maxRequests: 60, windowSeconds: 60 } satisfies RateLimitConfig,
  /** Write operations (register, simulate, etc.) */
  write: { maxRequests: 10, windowSeconds: 60 } satisfies RateLimitConfig,
  /** Auth endpoints */
  auth: { maxRequests: 5, windowSeconds: 60 } satisfies RateLimitConfig,
} as const;

export function rateLimit(
  key: string,
  config: RateLimitConfig
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + config.windowSeconds * 1000;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: config.maxRequests - 1, resetAt };
  }

  if (entry.count >= config.maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}
