// backend/src/controllers/settings.controller.ts
import { Hono } from 'hono';
import { settingsService } from '../services/settings.service';
import { authMiddleware, requireRoles, type HonoVariables } from '../middleware/auth';
import { settingsSchema } from '../validators/settings.validator';

export const settingsRouter = new Hono<{ Variables: HonoVariables }>();

settingsRouter.use('*', authMiddleware);

settingsRouter.get('/', async (c) => {
  const shopId = c.get('shopId');
  
  const settings = await settingsService.getSettings(shopId);

  return c.json({
    success: true,
    message: 'Settings fetched successfully',
    data: settings,
  });
});

// Settings update restricted to owner role only
settingsRouter.put('/', requireRoles(['owner']), async (c) => {
  const shopId = c.get('shopId');
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = settingsSchema.parse(body);

  const settings = await settingsService.updateSettings(shopId, userId, parsed);

  return c.json({
    success: true,
    message: 'Billing preferences updated successfully',
    data: settings,
  });
});
