// backend/src/controllers/customer.controller.ts
import { Hono } from 'hono';
import { customerService } from '../services/customer.service';
import { authMiddleware, type HonoVariables } from '../middleware/auth';
import { customerSchema } from '../validators/customer.validator';

export const customerRouter = new Hono<{ Variables: HonoVariables }>();

// Apply Auth check on all endpoints
customerRouter.use('*', authMiddleware);

customerRouter.get('/', async (c) => {
  const shopId = c.get('shopId');
  const search = c.req.query('search') || undefined;
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '10');

  const result = await customerService.getCustomers(shopId, { search, page, pageSize });

  return c.json({
    success: true,
    message: 'Customers fetched successfully',
    data: result,
  });
});

customerRouter.get('/:id', async (c) => {
  const shopId = c.get('shopId');
  const id = c.req.param('id');

  const customer = await customerService.getCustomerById(shopId, id);

  return c.json({
    success: true,
    message: 'Customer ledger logs retrieved successfully',
    data: customer,
  });
});

customerRouter.post('/', async (c) => {
  const shopId = c.get('shopId');
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = customerSchema.parse(body);

  const customer = await customerService.createCustomer(shopId, userId, parsed);

  return c.json({
    success: true,
    message: 'Customer created successfully',
    data: customer,
  }, 201);
});

customerRouter.put('/:id', async (c) => {
  const shopId = c.get('shopId');
  const userId = c.get('userId');
  const id = c.req.param('id');
  const body = await c.req.json();
  
  // Partial parse support for updates
  const parsed = customerSchema.partial().parse(body);

  const customer = await customerService.updateCustomer(shopId, id, userId, parsed);

  return c.json({
    success: true,
    message: 'Customer details updated successfully',
    data: customer,
  });
});

customerRouter.delete('/:id', async (c) => {
  const shopId = c.get('shopId');
  const userId = c.get('userId');
  const id = c.req.param('id');

  await customerService.deleteCustomer(shopId, id, userId);

  return c.json({
    success: true,
    message: 'Customer soft deleted successfully',
  });
});
