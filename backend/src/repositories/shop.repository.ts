// backend/src/repositories/shop.repository.ts
import { prisma } from '../database/db';
import type { Prisma, Shop } from '@prisma/client';

export const shopRepository = {
  async create(data: Prisma.ShopCreateInput): Promise<Shop> {
    return prisma.shop.create({ data });
  },

  async findById(id: string): Promise<Shop | null> {
    return prisma.shop.findFirst({
      where: { id, deletedAt: null },
    });
  },

  async findByEmail(email: string): Promise<Shop | null> {
    return prisma.shop.findFirst({
      where: { email, deletedAt: null },
    });
  },

  async update(id: string, data: Prisma.ShopUpdateInput): Promise<Shop> {
    return prisma.shop.update({
      where: { id },
      data,
    });
  },

  // Soft delete
  async delete(id: string, updatedBy?: string): Promise<Shop> {
    return prisma.shop.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy,
      },
    });
  },
};
