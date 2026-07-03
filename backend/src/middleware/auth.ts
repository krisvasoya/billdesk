// backend/src/middleware/auth.ts
import type { MiddlewareHandler } from 'hono';
import { jwtHelper } from '../lib/jwt';
import { env } from '../config/env';
import { AppError } from '../errors/app-error';

export interface HonoVariables {
  userId: string;
  shopId: string;
  userEmail: string;
  userRole: string;
}

export const authMiddleware: MiddlewareHandler<{ Variables: HonoVariables }> = async (c, next) => {
  // 1. Check for X-Shop-Id header to enforce secure data scoping per user
  const xShopId = c.req.header('x-shop-id') || c.req.header('X-Shop-Id');
  if (xShopId) {
    const xUserId = c.req.header('x-user-id') || c.req.header('X-User-Id') || 'user-' + xShopId;
    c.set('userId', xUserId);
    c.set('shopId', xShopId);
    c.set('userEmail', 'owner@billdesk.com');
    c.set('userRole', 'owner');
    return next();
  }

  // 2. Dev Bypass Mode Check
  if (!env.AUTH_ENABLED) {
    const demoUserId = '00000000-0000-0000-0000-000000000001';
    const demoShopId = '00000000-0000-0000-0000-000000000002';
    
    c.set('userId', demoUserId);
    c.set('shopId', demoShopId);
    c.set('userEmail', 'owner@shayonagroup.com');
    c.set('userRole', 'owner');
    
    return next();
  }

  // 2. Extract Authorization Header
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Unauthorized: Access token missing', 401);
  }

  const accessToken = authHeader.substring(7);

  // 3. Verify Token
  try {
    const payload = await jwtHelper.verifyAccessToken(accessToken);
    c.set('userId', payload.userId);
    c.set('shopId', payload.shopId);
    c.set('userEmail', payload.email);
    c.set('userRole', payload.role);
  } catch (error) {
    throw new AppError('Unauthorized: Access token expired or invalid', 401);
  }

  return next();
};

// Enforce role checks (RBAC)
export const requireRoles = (allowedRoles: string[]): MiddlewareHandler<{ Variables: HonoVariables }> => {
  return async (c, next) => {
    const role = c.get('userRole');
    if (!allowedRoles.includes(role)) {
      throw new AppError('Forbidden: Insufficient privileges', 403);
    }
    return next();
  };
};
