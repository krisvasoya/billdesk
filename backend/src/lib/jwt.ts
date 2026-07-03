// backend/src/lib/jwt.ts
import { sign, verify } from 'hono/jwt';
import { env } from '../config/env';

export interface TokenPayload {
  userId: string;
  shopId: string;
  role: string;
  email: string;
  exp: number;
  [key: string]: unknown;
}

export const jwtHelper = {
  async generateAccessToken(user: { id: string; shopId: string; role: string; email: string }): Promise<string> {
    const payload: TokenPayload = {
      userId: user.id,
      shopId: user.shopId,
      role: user.role,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
    };
    return sign(payload, env.JWT_SECRET);
  },

  async generateRefreshToken(user: { id: string; shopId: string; role: string; email: string }): Promise<string> {
    const payload: TokenPayload = {
      userId: user.id,
      shopId: user.shopId,
      role: user.role,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    };
    return sign(payload, env.JWT_REFRESH_SECRET);
  },

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    const payload = await verify(token, env.JWT_SECRET, 'HS256');
    return payload as unknown as TokenPayload;
  },

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    const payload = await verify(token, env.JWT_REFRESH_SECRET, 'HS256');
    return payload as unknown as TokenPayload;
  },
};
