// backend/src/controllers/auth.controller.ts
import { Hono } from 'hono';
import { authService } from '../services/auth.service';
import { registerSchema, loginSchema, refreshSchema } from '../validators/auth.validator';
import { rateLimiter } from '../middleware/rate-limiter';
import { logger } from '../logger';

export const authRouter = new Hono();

// Enforce login rate limit (5 requests per min)
authRouter.post('/login', rateLimiter({ keyPrefix: 'login', limit: 5, windowMs: 60 * 1000 }), async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.parse(body);

  const ip = c.req.header('x-forwarded-for') || '127.0.0.1';
  const ua = c.req.header('user-agent') || 'unknown';

  const result = await authService.login(parsed.email, parsed.passwordHash, ip, ua);
  
  logger.info({ email: parsed.email }, 'User logged in successfully');
  return c.json({
    success: true,
    message: 'Login successful',
    data: result,
  });
});

// Enforce registration rate limit (3 registrations per hour)
authRouter.post('/register', rateLimiter({ keyPrefix: 'register', limit: 3, windowMs: 60 * 60 * 1000 }), async (c) => {
  const body = await c.req.json();
  const parsed = registerSchema.parse(body);

  const result = await authService.register(parsed);

  logger.info({ email: parsed.email, shopName: parsed.shopName }, 'Shop and User registered successfully');
  return c.json({
    success: true,
    message: 'Shop registered successfully',
    data: result,
  }, 201); // Custom HTTP success code for created state
});

authRouter.post('/refresh', async (c) => {
  const body = await c.req.json();
  const parsed = refreshSchema.parse(body);

  const result = await authService.refreshTokens(parsed.refreshToken);

  return c.json({
    success: true,
    message: 'Tokens refreshed successfully',
    data: result,
  });
});

authRouter.post('/logout', async (c) => {
  const body = await c.req.json();
  const parsed = refreshSchema.parse(body);

  await authService.logout(parsed.refreshToken);

  return c.json({
    success: true,
    message: 'Logout successful',
  });
});
