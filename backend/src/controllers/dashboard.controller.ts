// backend/src/controllers/dashboard.controller.ts
import { Hono } from 'hono';
import { invoiceService } from '../services/invoice.service';
import { authMiddleware, type HonoVariables } from '../middleware/auth';
import { redis } from '../config/redis';
import { logger } from '../logger';

export const dashboardRouter = new Hono<{ Variables: HonoVariables }>();

dashboardRouter.use('*', authMiddleware);

dashboardRouter.get('/', async (c) => {
  const shopId = c.get('shopId');
  const startDate = c.req.query('startDate') || undefined;
  const endDate = c.req.query('endDate') || undefined;

  const cacheKey = `dashboard:stats:${shopId}:${startDate || 'all'}:${endDate || 'all'}`;

  // 1. Attempt Cache load
  try {
    const cachedStats = await redis.get(cacheKey);
    if (cachedStats) {
      logger.info({ cacheKey }, 'Serving dashboard stats from Redis cache');
      return c.json({
        success: true,
        message: 'Dashboard metrics fetched successfully (cached)',
        data: cachedStats,
      });
    }
  } catch (error) {
    logger.error({ error }, 'Failed to read from cache client');
  }

  // 2. Cache miss, query database
  const stats = await invoiceService.getInvoiceStats(shopId, startDate, endDate);

  // 3. Write cache with 5-minute expiry
  try {
    await redis.set(cacheKey, stats, { ex: 5 * 60 });
  } catch (error) {
    logger.error({ error }, 'Failed to write to cache client');
  }

  return c.json({
    success: true,
    message: 'Dashboard metrics fetched successfully',
    data: stats,
  });
});
