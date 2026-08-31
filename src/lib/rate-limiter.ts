interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const ipMap = new Map<string, RateLimitRecord>();

// Clean up stale records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of ipMap.entries()) {
    if (val.resetAt < now) {
      ipMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * In-memory sliding window rate limiter against brute-force attacks.
 * @param ip Client IP address or identifier
 * @param maxAttempts Max allowed attempts within window
 * @param windowMs Time window in milliseconds (default: 5 minutes)
 */
export function checkRateLimit(
  ip: string,
  maxAttempts: number = 5,
  windowMs: number = 5 * 60 * 1000
): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  const record = ipMap.get(ip);

  if (!record || record.resetAt < now) {
    ipMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, retryAfterSec: 0 };
  }

  if (record.count >= maxAttempts) {
    const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  record.count++;
  return {
    allowed: true,
    remaining: maxAttempts - record.count,
    retryAfterSec: 0,
  };
}

export function resetRateLimit(ip: string): void {
  ipMap.delete(ip);
}
