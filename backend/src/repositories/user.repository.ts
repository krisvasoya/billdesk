// backend/src/repositories/user.repository.ts
import { prisma } from '../database/db';
import type { Prisma, User } from '@prisma/client';

export const userRepository = {
  async create(data: Prisma.UserUncheckedCreateInput): Promise<User> {
    return prisma.user.create({ data });
  },

  async findById(id: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  },

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  },

  async findAllByShopId(shopId: string): Promise<User[]> {
    return prisma.user.findMany({
      where: { shopId, deletedAt: null },
    });
  },

  async update(id: string, shopId: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id, shopId }, // enforce multitenant security
      data,
    });
  },

  async delete(id: string, shopId: string, updatedBy?: string): Promise<User> {
    return prisma.user.update({
      where: { id, shopId },
      data: {
        deletedAt: new Date(),
        updatedBy,
      },
    });
  },
};
