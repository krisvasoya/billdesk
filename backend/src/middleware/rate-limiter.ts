// backend/src/middleware/rate-limiter.ts
import type { MiddlewareHandler } from 'hono';
import { redis } from '../config/redis';
import { AppError } from '../errors/app-error';

export const rateLimiter = (options: {
  keyPrefix: string;
  limit: number;
  windowMs: number; // e.g. 60000 for 1 minute
}): MiddlewareHandler => {
  return async (c, next) => {
    // 1. Resolve client IP or fallback
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '127.0.0.1';
    const cleanIp = ip.split(',')[0].trim();
    const redisKey = `ratelimit:${options.keyPrefix}:${cleanIp}`;

    // 2. Increment request count in cache
    const currentRequests = await redis.incr(redisKey);

    // 3. Set expiration window if first request
    if (currentRequests === 1) {
      await redis.set(redisKey, 1, { ex: Math.ceil(options.windowMs / 1000) });
    }

    // 4. Evaluate limit
    if (currentRequests > options.limit) {
      throw new AppError('Too many requests. Please try again later.', 429);
    }

    return next();
  };
};
