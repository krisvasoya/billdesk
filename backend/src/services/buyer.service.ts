// backend/src/services/buyer.service.ts
import { buyerRepository, type BuyerWithOutstanding } from '../repositories/buyer.repository';
import { activityLogRepository } from '../repositories/activity-log.repository';
import type { Buyer } from '@prisma/client';

export const buyerService = {
  async getBuyers(
    shopId: string,
    params: { search?: string; page?: number; pageSize?: number }
  ): Promise<{ data: BuyerWithOutstanding[]; total: number }> {
    return buyerRepository.findAll(shopId, params);
  },

  async getBuyerById(shopId: string, id: string): Promise<BuyerWithOutstanding | null> {
    return buyerRepository.findById(shopId, id);
  },

  async createBuyer(
    shopId: string,
    userId: string,
    data: {
      buyerName: string;
      mobile?: string;
      email?: string;
      address?: string;
      gstNumber?: string;
      openingBalance?: number;
      creditLimit?: number;
      notes?: string;
    }
  ): Promise<Buyer> {
    const buyer = await buyerRepository.create(shopId, data);

    await activityLogRepository.log({
      shopId,
      userId,
      action: 'BUYER_CREATED',
      details: `Buyer ${buyer.buyerName} created successfully`,
    });

    return buyer;
  },

  async updateBuyer(
    shopId: string,
    id: string,
    userId: string,
    data: {
      buyerName?: string;
      mobile?: string;
      email?: string;
      address?: string;
      gstNumber?: string;
      creditLimit?: number;
      notes?: string;
    }
  ): Promise<Buyer> {
    const buyer = await buyerRepository.update(shopId, id, data);

    await activityLogRepository.log({
      shopId,
      userId,
      action: 'BUYER_UPDATED',
      details: `Buyer ${buyer.buyerName} updated successfully`,
    });

    return buyer;
  },

  async deleteBuyer(shopId: string, id: string, userId: string): Promise<Buyer> {
    const buyer = await buyerRepository.delete(shopId, id, userId);

    await activityLogRepository.log({
      shopId,
      userId,
      action: 'BUYER_DELETED',
      details: `Buyer ${buyer.buyerName} soft deleted`,
    });

    return buyer;
  },
};
