// backend/src/controllers/payment.controller.ts
import { Hono } from 'hono';
import { paymentService } from '../services/payment.service';
import { authMiddleware, type HonoVariables } from '../middleware/auth';
import { paymentSchema } from '../validators/payment.validator';
import { rateLimiter } from '../middleware/rate-limiter';

export const paymentRouter = new Hono<{ Variables: HonoVariables }>();

paymentRouter.use('*', authMiddleware);

paymentRouter.get('/', async (c) => {
  const shopId = c.get('shopId');
  const customerId = c.req.query('customerId') || undefined;
  const invoiceId = c.req.query('invoiceId') || undefined;
  const search = c.req.query('search') || undefined;
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '10');

  const result = await paymentService.getPayments(shopId, {
    customerId,
    invoiceId,
    search,
    page,
    pageSize,
  });

  return c.json({
    success: true,
    message: 'Payments ledger fetched successfully',
    data: result,
  });
});

// Rate limit payment recordings to prevent database double clicks
paymentRouter.post('/', rateLimiter({ keyPrefix: 'payment_recording', limit: 20, windowMs: 60 * 1000 }), async (c) => {
  const shopId = c.get('shopId');
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = paymentSchema.parse(body);

  const formattedPaymentData = {
    ...parsed,
    paymentDate: new Date(parsed.paymentDate),
  };

  const payment = await paymentService.recordPayment(shopId, userId, formattedPaymentData);

  return c.json({
    success: true,
    message: 'Payment logged successfully',
    data: payment,
  }, 201);
});

paymentRouter.delete('/:id', async (c) => {
  const shopId = c.get('shopId');
  const userId = c.get('userId');
  const id = c.req.param('id');

  await paymentService.deletePayment(shopId, id, userId);

  return c.json({
    success: true,
    message: 'Payment receipt reverted successfully',
  });
});
