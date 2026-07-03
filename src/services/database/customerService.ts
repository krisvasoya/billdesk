// src/services/database/customerService.ts
import { CustomerRepository } from '../../repositories/CustomerRepository';
import { generateId } from './db';
import type { Customer, PaginatedResult } from '../../types';
import { syncService } from '../syncService';

export const customerService = {
  async getAll(
    shopId: string,
    opts?: { search?: string; page?: number; pageSize?: number }
  ): Promise<PaginatedResult<Customer>> {
    return CustomerRepository.getAll(shopId, opts);
  },

  async getById(shopId: string, id: string): Promise<Customer | null> {
    return CustomerRepository.getById(shopId, id);
  },

  async checkDuplicate(shopId: string, name: string, mobile?: string): Promise<Customer | null> {
    return CustomerRepository.checkDuplicate(shopId, name, mobile);
  },

  async create(
    shopId: string,
    data: Omit<Customer, 'id' | 'shopId' | 'totalBilled' | 'totalPaid' | 'outstanding' | 'createdAt' | 'updatedAt'>
  ): Promise<Customer> {
    const id = generateId();
    try {
      const created = await CustomerRepository.create(shopId, id, data);
      await syncService.queueOperation('customer', id, 'create', created).catch(err => {
        console.warn('Queue operation failed for customer creation:', err);
      });
      return created;
    } catch (e) {
      console.error('SQLite customer insert service error:', e);
      throw e;
    }
  },

  async update(
    shopId: string,
    id: string,
    data: Partial<Omit<Customer, 'id' | 'shopId' | 'createdAt'>>
  ): Promise<Customer> {
    try {
      const updated = await CustomerRepository.update(shopId, id, data);
      await syncService.queueOperation('customer', id, 'update', updated).catch(err => {
        console.warn('Queue operation failed for customer update:', err);
      });
      return updated;
    } catch (e) {
      console.error('SQLite customer update service error:', e);
      throw e;
    }
  },

  async delete(shopId: string, id: string): Promise<void> {
    try {
      await CustomerRepository.delete(shopId, id);
      await syncService.queueOperation('customer', id, 'delete', { id }).catch(err => {
        console.warn('Queue operation failed for customer delete:', err);
      });
    } catch (e) {
      console.error('SQLite customer delete service error:', e);
      throw e;
    }
  }
};
