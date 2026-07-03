// backend/src/repositories/settings.repository.ts
import { prisma } from '../database/db';
import type { Prisma, Settings } from '@prisma/client';

export const settingsRepository = {
  async findByShopId(shopId: string): Promise<Settings | null> {
    return prisma.settings.findUnique({
      where: { shopId },
    });
  },

  async create(shopId: string, data: Omit<Prisma.SettingsUncheckedCreateInput, 'shopId'>): Promise<Settings> {
    return prisma.settings.create({
      data: {
        ...data,
        shopId,
      },
    });
  },

  async update(shopId: string, data: Prisma.SettingsUpdateInput): Promise<Settings> {
    return prisma.settings.update({
      where: { shopId },
      data,
    });
  },
};
