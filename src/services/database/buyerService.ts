// src/services/database/buyerService.ts
import { BuyerRepository } from '../../repositories/BuyerRepository';
import { generateId } from './db';
import type { Buyer, PaginatedResult } from '../../types';
import { syncService } from '../syncService';

export const buyerService = {
  async getAll(
    shopId: string,
    opts?: { search?: string; page?: number; pageSize?: number; sortBy?: 'name' | 'outstanding' | 'recent' }
  ): Promise<PaginatedResult<Buyer>> {
    return BuyerRepository.getAll(shopId, opts);
  },

  async getById(shopId: string, id: string): Promise<Buyer | null> {
    return BuyerRepository.getById(shopId, id);
  },

  async checkDuplicate(shopId: string, name: string, mobile?: string): Promise<Buyer | null> {
    return BuyerRepository.checkDuplicate(shopId, name, mobile);
  },

  async create(
    shopId: string,
    data: Omit<Buyer, 'id' | 'shopId' | 'createdAt' | 'updatedAt'>
  ): Promise<Buyer> {
    const id = generateId();
    try {
      const created = await BuyerRepository.create(shopId, id, data);
      await syncService.queueOperation('buyer', id, 'create', created).catch(err => {
        console.warn('Queue operation failed for buyer creation:', err);
      });
      return created;
    } catch (e) {
      console.error('SQLite buyer insert service error:', e);
      throw e;
    }
  },

  async update(
    shopId: string,
    id: string,
    data: Partial<Omit<Buyer, 'id' | 'shopId' | 'createdAt'>>
  ): Promise<Buyer> {
    try {
      const updated = await BuyerRepository.update(shopId, id, data);
      await syncService.queueOperation('buyer', id, 'update', updated).catch(err => {
        console.warn('Queue operation failed for buyer update:', err);
      });
      return updated;
    } catch (e) {
      console.error('SQLite buyer update service error:', e);
      throw e;
    }
  },

  async delete(shopId: string, id: string): Promise<void> {
    try {
      await BuyerRepository.delete(shopId, id);
      await syncService.queueOperation('buyer', id, 'delete', { id }).catch(err => {
        console.warn('Queue operation failed for buyer delete:', err);
      });
    } catch (e) {
      console.error('SQLite buyer delete service error:', e);
      throw e;
    }
  }
};
