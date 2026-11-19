/**
 * Fail-closed rate limiting for the password login path.
 *
 * This is deliberately separate from src/lib/rate-limit.ts: that limiter falls
 * back to in-memory counters when Redis is unavailable, which is fine for
 * webhooks but not for authentication. Here an unavailable Redis means "cannot
 * prove this attempt is safe", so callers must return 503 instead of allowing
 * an unlimited password guess.
 *
 * Keying:
 * - one sliding window per client IP, and
 * - one sliding window per normalized email fingerprint (SHA-256).
 * Both are checked. Emails are hashed so Redis never stores addresses.
 */
import { createHash, randomUUID } from "node:crypto";
import Redis from "ioredis";
import type { HortusConfig } from "./config";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export type AuthRateLimitResult =
  | { status: "allowed" }
  | { status: "limited"; retryAfter: number }
  | { status: "unavailable" };

interface WindowDecision {
  allowed: boolean;
  retryAfter?: number;
}

/** Lowercase and trim so `User@X.com` and `user@x.com` share a bucket. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Best-effort client IP. Behind a reverse proxy, X-Forwarded-For must be set by
 * that proxy; the first hop is the original client. Without headers (local
 * direct access), all attempts share the "unknown" bucket.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Stable, non-reversible bucket id for an email address. */
export function emailFingerprint(email: string): string {
  return createHash("sha256").update(normalizeEmail(email)).digest("hex");
}

function ipKey(ip: string): string {
  return `auth:login:ip:${ip}`;
}

function emailKey(email: string): string {
  return `auth:login:email:${emailFingerprint(email)}`;
}

async function connect(): Promise<Redis | null> {
  const redis = new Redis(REDIS_URL, {
    lazyConnect: true,
    connectTimeout: 1000,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    enableOfflineQueue: false,
  });
  try {
    await redis.connect();
    return redis;
  } catch {
    redis.disconnect();
    return null;
  }
}

/**
 * Consume one slot from a sliding window. The sorted set stores timestamps in
 * milliseconds; entries older than the window are pruned before counting.
 */
async function consume(
  redis: Redis,
  key: string,
  limit: number,
  windowMs: number,
): Promise<WindowDecision> {
  const now = Date.now();
  const windowStart = now - windowMs;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zcard(key);
  const results = await pipeline.exec();
  const current = (results?.[1]?.[1] as number | undefined) ?? 0;

  if (current >= limit) {
    const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
    const oldestTs = Number.parseInt(oldest[1] || "0", 10);
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((oldestTs + windowMs - now) / 1000)),
    };
  }

  await redis.zadd(key, now, `${now}:${randomUUID()}`);
  await redis.pexpire(key, windowMs);
  return { allowed: true };
}

/**
 * Check both buckets before attempting authentication.
 *
 * Returns `unavailable` on any Redis problem; the route maps that to 503. Do not
 * turn this into a fail-open fallback for login.
 */
export async function checkLoginRateLimit(
  input: { ip: string; email: string },
  config: Pick<HortusConfig, "loginMaxAttempts" | "loginWindowSeconds">,
): Promise<AuthRateLimitResult> {
  const redis = await connect();
  if (!redis) return { status: "unavailable" };

  const windowMs = Math.max(1000, config.loginWindowSeconds * 1000);
  const limit = Math.max(1, config.loginMaxAttempts);

  try {
    const byIp = await consume(redis, ipKey(input.ip), limit, windowMs);
    if (!byIp.allowed) {
      return { status: "limited", retryAfter: byIp.retryAfter ?? 1 };
    }

    const byEmail = await consume(redis, emailKey(input.email), limit, windowMs);
    if (!byEmail.allowed) {
      return { status: "limited", retryAfter: byEmail.retryAfter ?? 1 };
    }

    return { status: "allowed" };
  } catch {
    return { status: "unavailable" };
  } finally {
    redis.disconnect();
  }
}

/**
 * Clear both buckets after a successful login. Failure is non-fatal: the user
 * already authenticated, and keeping a stale counter only risks a later 429.
 */
export async function clearLoginRateLimit(input: { ip: string; email: string }): Promise<void> {
  const redis = await connect();
  if (!redis) return;
  try {
    await redis.del(ipKey(input.ip), emailKey(input.email));
  } catch {
    // Best effort by design.
  } finally {
    redis.disconnect();
  }
}
