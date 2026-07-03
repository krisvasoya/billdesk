// backend/src/app/api/[[...route]]/route.ts
import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { cors } from 'hono/cors';
import { authRouter } from '../../../controllers/auth.controller';
import { dashboardRouter } from '../../../controllers/dashboard.controller';
import { customerRouter } from '../../../controllers/customer.controller';
import { buyerRouter } from '../../../controllers/buyer.controller';
import { invoiceRouter } from '../../../controllers/invoice.controller';
import { paymentRouter } from '../../../controllers/payment.controller';
import { reportRouter } from '../../../controllers/report.controller';
import { settingsRouter } from '../../../controllers/settings.controller';
import { uploadRouter } from '../../../controllers/upload.controller';
import { errorHandler } from '../../../middleware/error-handler';
import { logger } from '../../../logger';

// 1. Initialize Hono App instance
const app = new Hono().basePath('/api');

// 2. Security Headers & CORS configuration
app.use('*', cors({
  origin: '*', // Supports cross-origin mobile apps. In production, restrict to app domains if web access is not needed.
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

// Helmet equivalent security headers middleware
app.use('*', async (c, next) => {
  c.header('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'; object-src 'none';");
  c.header('X-Frame-Options', 'DENY');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('X-DNS-Prefetch-Control', 'off');
  c.header('X-Download-Options', 'noopen');
  await next();
});

// Basic Request Auditing Log Middleware
app.use('*', async (c, next) => {
  const method = c.req.method;
  const path = c.req.path;
  logger.info({ method, path }, `API Request Received`);
  await next();
});

// 3. Register Controllers/Routes
app.route('/auth', authRouter);
app.route('/dashboard', dashboardRouter);
app.route('/customers', customerRouter);
app.route('/buyers', buyerRouter);
app.route('/invoices', invoiceRouter);
app.route('/payments', paymentRouter);
app.route('/reports', reportRouter);
app.route('/settings', settingsRouter);
app.route('/uploads', uploadRouter);

// 4. Centralized Global Error Handler
app.onError(errorHandler);

// Custom Not Found response handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      message: `Resource not found: ${c.req.url}`,
    },
    404
  );
});

// 5. Export Next.js App Router Handlers
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);
export type AppType = typeof app;
