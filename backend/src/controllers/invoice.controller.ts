// backend/src/controllers/invoice.controller.ts
import { Hono } from 'hono';
import { invoiceService } from '../services/invoice.service';
import { authMiddleware, type HonoVariables } from '../middleware/auth';
import { invoiceSchema } from '../validators/invoice.validator';
import { rateLimiter } from '../middleware/rate-limiter';

export const invoiceRouter = new Hono<{ Variables: HonoVariables }>();

// Apply Auth check on all endpoints
invoiceRouter.use('*', authMiddleware);

invoiceRouter.get('/', async (c) => {
  const shopId = c.get('shopId');
  const customerId = c.req.query('customerId') || undefined;
  const buyerId = c.req.query('buyerId') || undefined;
  const status = c.req.query('status') || undefined;
  const search = c.req.query('search') || undefined;
  const page = parseInt(c.req.query('page') || '1');
  const pageSize = parseInt(c.req.query('pageSize') || '10');

  const result = await invoiceService.getInvoices(shopId, {
    customerId,
    buyerId,
    status,
    search,
    page,
    pageSize,
  });

  return c.json({
    success: true,
    message: 'Invoices fetched successfully',
    data: result,
  });
});

invoiceRouter.get('/:id', async (c) => {
  const shopId = c.get('shopId');
  const id = c.req.param('id');

  const invoice = await invoiceService.getInvoiceById(shopId, id);

  return c.json({
    success: true,
    message: 'Invoice metadata retrieved successfully',
    data: invoice,
  });
});

// Protect Invoice creation with a rate limiter (30 requests/min)
invoiceRouter.post('/', rateLimiter({ keyPrefix: 'invoice_creation', limit: 30, windowMs: 60 * 1000 }), async (c) => {
  const shopId = c.get('shopId');
  const userId = c.get('userId');
  const body = await c.req.json();
  
  // Zod parsing and validation
  const parsed = invoiceSchema.parse(body);

  const { items, ...invoiceFields } = parsed;

  // Convert dates to standard Date instances
  const formattedInvoiceData = {
    ...invoiceFields,
    invoiceDate: new Date(invoiceFields.invoiceDate),
    dueDate: invoiceFields.dueDate ? new Date(invoiceFields.dueDate) : undefined,
  };

  const invoice = await invoiceService.createInvoice(shopId, userId, formattedInvoiceData, items);

  return c.json({
    success: true,
    message: 'Invoice generated successfully',
    data: invoice,
  }, 201);
});

invoiceRouter.delete('/:id', async (c) => {
  const shopId = c.get('shopId');
  const userId = c.get('userId');
  const id = c.req.param('id');

  await invoiceService.deleteInvoice(shopId, id, userId);

  return c.json({
    success: true,
    message: 'Invoice soft deleted successfully',
  });
});
