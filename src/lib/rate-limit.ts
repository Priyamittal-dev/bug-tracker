import { getRedisClient } from "@/lib/redis";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

// In-memory sliding window fallback store
const inMemoryStore = new Map<string, { count: number; expiresAt: number }>();

// Periodically clean expired entries from in-memory store
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of inMemoryStore.entries()) {
    if (value.expiresAt <= now) {
      inMemoryStore.delete(key);
    }
  }
}, 60000);
if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

/**
 * Sliding window rate limiter.
 * @param identifier Unique rate-limiting key (e.g. `login:127.0.0.1` or `register:user@email.com`)
 * @param maxRequests Maximum requests permitted within the window
 * @param windowSeconds Time window in seconds
 */
export async function rateLimit(
  identifier: string,
  maxRequests = 5,
  windowSeconds = 60,
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const key = `ratelimit:${identifier}`;

  if (redis) {
    try {
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }
      const ttl = await redis.ttl(key);
      const allowed = current <= maxRequests;
      return {
        allowed,
        remaining: Math.max(0, maxRequests - current),
        resetSeconds: ttl > 0 ? ttl : windowSeconds,
      };
    } catch {
      // Fallback to in-memory store below if Redis command fails
    }
  }

  // In-memory fallback
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const entry = inMemoryStore.get(key);

  if (!entry || entry.expiresAt <= now) {
    inMemoryStore.set(key, { count: 1, expiresAt: now + windowMs });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetSeconds: windowSeconds,
    };
  }

  entry.count += 1;
  const remaining = Math.max(0, maxRequests - entry.count);
  const resetSeconds = Math.ceil((entry.expiresAt - now) / 1000);

  return {
    allowed: entry.count <= maxRequests,
    remaining,
    resetSeconds,
  };
}
