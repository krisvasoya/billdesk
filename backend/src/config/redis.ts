// backend/src/config/redis.ts
import { Redis } from '@upstash/redis';
import { env } from './env';
import { logger } from '../logger';

let redisClient: Redis | null = null;

if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redisClient = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    logger.info('Connected to Upstash Redis successfully.');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize Upstash Redis client. Running mock cache.');
  }
} else {
  logger.warn('Upstash Redis credentials missing. Caching & Rate Limiting are operating in local mock mode.');
}

// Fallback Mock implementation to prevent application crashes when Redis is offline or not set
const localCache = new Map<string, { value: string; expiresAt: number }>();

export const redis = {
  async get<T>(key: string): Promise<T | null> {
    if (redisClient) {
      try {
        const val = await redisClient.get(key);
        return val as T | null;
      } catch (err) {
        logger.error({ err, key }, 'Redis GET error');
      }
    }

    const cached = localCache.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
      localCache.delete(key);
      return null;
    }
    return JSON.parse(cached.value) as T;
  },

  async set(key: string, value: any, options?: { ex: number }): Promise<void> {
    if (redisClient) {
      try {
        const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
        if (options?.ex) {
          await redisClient.set(key, valueStr, { ex: options.ex });
        } else {
          await redisClient.set(key, valueStr);
        }
        return;
      } catch (err) {
        logger.error({ err, key }, 'Redis SET error');
      }
    }

    const duration = (options?.ex || 300) * 1000; // default 5 mins
    localCache.set(key, {
      value: JSON.stringify(value),
      expiresAt: Date.now() + duration,
    });
  },

  async del(key: string): Promise<void> {
    if (redisClient) {
      try {
        await redisClient.del(key);
        return;
      } catch (err) {
        logger.error({ err, key }, 'Redis DEL error');
      }
    }
    localCache.delete(key);
  },

  async incr(key: string): Promise<number> {
    if (redisClient) {
      try {
        return await redisClient.incr(key);
      } catch (err) {
        logger.error({ err, key }, 'Redis INCR error');
      }
    }
    const current = localCache.get(key);
    const nextVal = current ? parseInt(JSON.parse(current.value)) + 1 : 1;
    localCache.set(key, {
      value: String(nextVal),
      expiresAt: Date.now() + 60 * 1000, // 1 minute window for rate limiting
    });
    return nextVal;
  },
};
