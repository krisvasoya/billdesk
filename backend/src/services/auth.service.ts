// backend/src/services/auth.service.ts
import bcrypt from 'bcrypt';
import { shopRepository } from '../repositories/shop.repository';
import { userRepository } from '../repositories/user.repository';
import { settingsRepository } from '../repositories/settings.repository';
import { activityLogRepository } from '../repositories/activity-log.repository';
import { jwtHelper } from '../lib/jwt';
import { prisma } from '../database/db';
import { AppError } from '../errors/app-error';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async register(data: {
    shopName: string;
    ownerName: string;
    email: string;
    mobile: string;
    businessType: string;
    passwordHash: string;
  }): Promise<{ shop: any; user: any; tokens: AuthTokens }> {
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(data.passwordHash, salt);

    // Run creation inside a Prisma transaction to ensure atomicity
    return prisma.$transaction(async (tx) => {
      // 1. Create Shop
      const shop = await tx.shop.create({
        data: {
          shopName: data.shopName,
          ownerName: data.ownerName,
          email: data.email,
          mobile: data.mobile,
          businessType: data.businessType,
        },
      });

      // 2. Create User linked to Shop
      const user = await tx.user.create({
        data: {
          shopId: shop.id,
          name: data.ownerName,
          email: data.email,
          mobile: data.mobile,
          passwordHash: hash,
          role: 'owner',
        },
      });

      // 3. Initialize Shop Settings
      await tx.settings.create({
        data: {
          shopId: shop.id,
        },
      });

      // 4. Generate tokens
      const accessToken = await jwtHelper.generateAccessToken(user);
      const refreshToken = await jwtHelper.generateRefreshToken(user);

      // Save Refresh Token in Database
      await tx.refreshToken.create({
        data: {
          userId: user.id,
          shopId: shop.id,
          token: refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // Audit Log
      await tx.activityLog.create({
        data: {
          shopId: shop.id,
          userId: user.id,
          action: 'SHOP_REGISTERED',
          details: `Shop ${data.shopName} and owner user created`,
        },
      });

      return {
        shop,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        tokens: { accessToken, refreshToken },
      };
    });
  },

  async login(email: string, passwordHash: string, ipAddress?: string, userAgent?: string): Promise<{ user: any; tokens: AuthTokens }> {
    const user = await userRepository.findByEmail(email);
    if (!user || !user.isActive) {
      throw new AppError('Invalid credentials or inactive account', 401);
    }

    const isMatch = await bcrypt.compare(passwordHash, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    const accessToken = await jwtHelper.generateAccessToken(user);
    const refreshToken = await jwtHelper.generateRefreshToken(user);

    // Save new Refresh Token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        shopId: user.shopId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Update lastLogin timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Logging audit
    await activityLogRepository.log({
      shopId: user.shopId,
      userId: user.id,
      action: 'USER_LOGIN',
      details: 'Successful user authentication',
      ipAddress,
    });

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role, shopId: user.shopId },
      tokens: { accessToken, refreshToken },
    };
  },

  async refreshTokens(token: string): Promise<AuthTokens> {
    // 1. Verify Refresh Token Signature
    let payload;
    try {
      payload = await jwtHelper.verifyRefreshToken(token);
    } catch (e) {
      throw new AppError('Invalid refresh token', 401);
    }

    // 2. Fetch Refresh Token from DB
    const dbToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!dbToken) {
      throw new AppError('Token not found in database', 401);
    }

    // 3. Security: Check if token was already rotated (re-used)
    if (dbToken.isRevoked) {
      // Automatic revocation cascade (security breaches protection)
      await prisma.refreshToken.updateMany({
        where: { userId: dbToken.userId },
        data: { isRevoked: true },
      });
      throw new AppError('Token compromise detected. Logging out all sessions.', 401);
    }

    // 4. Check expiration
    if (new Date() > dbToken.expiresAt) {
      await prisma.refreshToken.delete({ where: { token } });
      throw new AppError('Refresh token expired', 401);
    }

    // 5. Generate new Access and Refresh tokens
    const user = { id: dbToken.userId, shopId: dbToken.shopId || '', role: payload.role, email: payload.email };
    const nextAccessToken = await jwtHelper.generateAccessToken(user);
    const nextRefreshToken = await jwtHelper.generateRefreshToken(user);

    // 6. Rotate current token
    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { token },
        data: {
          isRevoked: true,
          rotatedTo: nextRefreshToken,
        },
      });

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          shopId: user.shopId,
          token: nextRefreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    });

    return {
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
    };
  },

  async logout(token: string): Promise<void> {
    try {
      const payload = await jwtHelper.verifyRefreshToken(token);
      await prisma.refreshToken.deleteMany({
        where: { token },
      });

      await activityLogRepository.log({
        shopId: payload.shopId,
        userId: payload.userId,
        action: 'USER_LOGOUT',
        details: 'User logged out',
      });
    } catch (e) {
      // Token verification fails or is already deleted
      await prisma.refreshToken.deleteMany({
        where: { token },
      });
    }
  },
};
