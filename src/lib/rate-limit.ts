import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

interface RateLimitConfig {
  requests?: number;
  windowSeconds?: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

const memoryWindows = new Map<string, number[]>();

function checkMemoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const timestamps = memoryWindows.get(key) || [];
  const valid = timestamps.filter((t) => now - t < windowMs);

  if (valid.length < limit) {
    valid.push(now);
    memoryWindows.set(key, valid);
    return { allowed: true };
  }

  const oldest = valid[0];
  const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
  return { allowed: false, retryAfter };
}

async function checkRedisRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const redis = new Redis(REDIS_URL, { lazyConnect: true, connectTimeout: 1000 });
  try {
    await redis.connect();
  } catch {
    return checkMemoryRateLimit(key, limit, windowMs);
  }

  try {
    const now = Date.now();
    const windowStart = now - windowMs;
    const redisKey = `ratelimit:${key}`;

    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(redisKey, 0, windowStart);
    pipeline.zcard(redisKey);
    const pipelineResults = await pipeline.exec();
    const current = (pipelineResults?.[1]?.[1] as number | undefined) ?? 0;

    if (current < limit) {
      await redis.zadd(redisKey, now, `${now}:${Math.random().toString(36).slice(2)}`);
      await redis.pexpire(redisKey, windowMs);
      return { allowed: true };
    }

    const oldestResult = await redis.zrange(redisKey, 0, 0, "WITHSCORES");
    const oldestTs = parseInt(oldestResult[1] || "0", 10);
    const retryAfter = Math.max(1, Math.ceil((oldestTs + windowMs - now) / 1000));
    return { allowed: false, retryAfter };
  } catch {
    return checkMemoryRateLimit(key, limit, windowMs);
  } finally {
    redis.disconnect();
  }
}

export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const limit = config.requests ? parseInt(String(config.requests), 10) : 0;
  if (!limit || limit <= 0) return { allowed: true };

  const windowSeconds = config.windowSeconds ? parseInt(String(config.windowSeconds), 10) : 60;
  const windowMs = Math.max(1000, windowSeconds * 1000);

  return checkRedisRateLimit(key, limit, windowMs);
}

export function formatRateLimitConfig(config: RateLimitConfig): string {
  if (!config.requests) return "Unlimited";
  return `${config.requests} req / ${config.windowSeconds || 60}s`;
}
