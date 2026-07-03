// backend/src/controllers/report.controller.ts
import { Hono } from 'hono';
import { reportService } from '../services/report.service';
import { authMiddleware, type HonoVariables } from '../middleware/auth';

export const reportRouter = new Hono<{ Variables: HonoVariables }>();

reportRouter.use('*', authMiddleware);

reportRouter.get('/sales', async (c) => {
  const shopId = c.get('shopId');
  const startDate = c.req.query('startDate') || undefined;
  const endDate = c.req.query('endDate') || undefined;
  const interval = (c.req.query('interval') as 'day' | 'month') || 'day';

  const result = await reportService.getSalesReport(shopId, { startDate, endDate, interval });

  return c.json({
    success: true,
    message: 'Sales analytics report generated successfully',
    data: result,
  });
});

reportRouter.get('/outstanding', async (c) => {
  const shopId = c.get('shopId');

  const result = await reportService.getOutstandingBalanceReport(shopId);

  return c.json({
    success: true,
    message: 'Outstanding client balances report generated successfully',
    data: result,
  });
});
