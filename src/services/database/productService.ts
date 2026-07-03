// src/services/database/productService.ts
import { ProductRepository } from '../../repositories/ProductRepository';
import { generateId } from './db';
import type { Product, PaginatedResult } from '../../types';
import { syncService } from '../syncService';

export const productService = {
  async getAll(shopId: string, search?: string): Promise<Product[]> {
    // Legacy mapping support for non-paginated getAll response
    const res = await ProductRepository.getAll(shopId, { search, pageSize: 200 });
    return res.data;
  },

  async getAllPaginated(
    shopId: string,
    opts?: { search?: string; page?: number; pageSize?: number }
  ): Promise<PaginatedResult<Product>> {
    return ProductRepository.getAll(shopId, opts);
  },

  async getById(shopId: string, id: string): Promise<Product | null> {
    return ProductRepository.getById(shopId, id);
  },

  async checkDuplicate(shopId: string, productName: string, sku?: string): Promise<Product | null> {
    return ProductRepository.checkDuplicate(shopId, productName, sku);
  },

  async getRecentProducts(shopId: string): Promise<Product[]> {
    return ProductRepository.getRecentProducts(shopId);
  },

  async getFrequentProducts(shopId: string): Promise<Product[]> {
    return ProductRepository.getFrequentProducts(shopId);
  },

  async create(
    shopId: string,
    data: Omit<Product, 'id' | 'shopId' | 'createdAt' | 'updatedAt'>
  ): Promise<Product> {
    const id = generateId();
    try {
      const created = await ProductRepository.create(shopId, id, data);
      await syncService.queueOperation('product', id, 'create', created).catch(err => {
        console.warn('Queue operation failed for product creation:', err);
      });
      return created;
    } catch (e) {
      console.error('SQLite product insert service error:', e);
      throw e;
    }
  },

  async update(shopId: string, id: string, data: Partial<Omit<Product, 'id' | 'shopId'>>): Promise<Product> {
    try {
      const updated = await ProductRepository.update(shopId, id, data);
      await syncService.queueOperation('product', id, 'update', updated).catch(err => {
        console.warn('Queue operation failed for product update:', err);
      });
      return updated;
    } catch (e) {
      console.error('SQLite product update service error:', e);
      throw e;
    }
  },

  async delete(shopId: string, id: string): Promise<void> {
    try {
      await ProductRepository.delete(shopId, id);
      await syncService.queueOperation('product', id, 'delete', { id }).catch(err => {
        console.warn('Queue operation failed for product delete:', err);
      });
    } catch (e) {
      console.error('SQLite product delete service error:', e);
      throw e;
    }
  },
};
