// backend/src/controllers/buyer.controller.ts
import { Hono } from 'hono';
import { buyerService } from '../services/buyer.service';
import { authMiddleware, type HonoVariables } from '../middleware/auth';
import { buyerSchema } from '../validators/customer.validator';

export const buyerRouter = new Hono<{ Variables: HonoVariables }>();

// Apply Auth check
buyerRouter.use('*', authMiddleware);

buyerRouter.get('/', async (c) => {
  const shopId = c.get('shopId');
  const search = c.req.query('search') || undefined;
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '10');

  const result = await buyerService.getBuyers(shopId, { search, page, pageSize });

  return c.json({
    success: true,
    message: 'Buyers fetched successfully',
    data: result,
  });
});

buyerRouter.get('/:id', async (c) => {
  const shopId = c.get('shopId');
  const id = c.req.param('id');

  const buyer = await buyerService.getBuyerById(shopId, id);

  return c.json({
    success: true,
    message: 'Buyer details retrieved successfully',
    data: buyer,
  });
});

buyerRouter.post('/', async (c) => {
  const shopId = c.get('shopId');
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = buyerSchema.parse(body);

  const buyer = await buyerService.createBuyer(shopId, userId, parsed);

  return c.json({
    success: true,
    message: 'Buyer created successfully',
    data: buyer,
  }, 201);
});

buyerRouter.put('/:id', async (c) => {
  const shopId = c.get('shopId');
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = await c.req.json();
  
  const parsed = buyerSchema.partial().parse(body);

  const buyer = await buyerService.updateBuyer(shopId, id, userId, parsed);

  return c.json({
    success: true,
    message: 'Buyer details updated successfully',
    data: buyer,
  });
});

buyerRouter.delete('/:id', async (c) => {
  const shopId = c.get('shopId');
  const userId = c.get('userId');
  const id = c.req.param('id');

  await buyerService.deleteBuyer(shopId, id, userId);

  return c.json({
    success: true,
    message: 'Buyer soft deleted successfully',
  });
});
