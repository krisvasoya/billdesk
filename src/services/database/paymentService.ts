// src/services/database/paymentService.ts
import { PaymentRepository } from '../../repositories/PaymentRepository';
import { generateId, getDatabase } from './db';
import type { Payment, PaymentMethod, PaginatedResult } from '../../types';
import { syncService } from '../syncService';

const mapPaymentToLegacy = (payment: Payment): any => {
  if (!payment) return null;
  return {
    ...payment,
    date: payment.paymentDate,
    method: payment.paymentMode,
  };
};

export const paymentService = {
  async getAll(
    shopId: string,
    opts?: {
      search?: string;
      customerId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<PaginatedResult<any>> {
    // Map dates or pass filters
    const res = await PaymentRepository.getAll(shopId, {
      search: opts?.search,
      customerId: opts?.customerId,
      page: opts?.page,
      pageSize: opts?.pageSize,
    });
    return {
      ...res,
      data: res.data.map(mapPaymentToLegacy),
    };
  },

  async getById(shopId: string, id: string): Promise<any | null> {
    const payment = await PaymentRepository.getById(shopId, id);
    return payment ? mapPaymentToLegacy(payment) : null;
  },

  async create(
    shopId: string,
    data: {
      customerId: string;
      customerName: string;
      invoiceId?: string;
      invoiceNumber?: string;
      amount: number;
      date: string;
      method: PaymentMethod;
      reference?: string;
      notes?: string;
    }
  ): Promise<any> {
    const id = generateId();
    try {
      const created = await PaymentRepository.create(shopId, id, {
        customerId: data.customerId,
        customerName: data.customerName,
        invoiceId: data.invoiceId,
        invoiceNumber: data.invoiceNumber,
        amount: data.amount,
        paymentDate: data.date,
        paymentMode: data.method,
        notes: data.notes,
      });

      const legacy = mapPaymentToLegacy(created);
      await syncService.queueOperation('payment', id, 'create', legacy).catch(err => {
        console.warn('Queue operation failed for payment creation:', err);
      });
      return legacy;
    } catch (e) {
      console.error('SQLite payment insert service error:', e);
      throw e;
    }
  },

  async delete(shopId: string, id: string): Promise<void> {
    try {
      await PaymentRepository.delete(shopId, id);
      await syncService.queueOperation('payment', id, 'delete', { id }).catch(err => {
        console.warn('Queue operation failed for payment delete:', err);
      });
    } catch (e) {
      console.error('SQLite payment delete service error:', e);
      throw e;
    }
  },

  async getTotalReceived(shopId: string, startDate?: string, endDate?: string): Promise<number> {
    const db = getDatabase();
    const params: string[] = [shopId];
    let dateFilter = '';
    if (startDate) { dateFilter += ' AND payment_date >= ?'; params.push(startDate); }
    if (endDate) { dateFilter += ' AND payment_date <= ?'; params.push(endDate); }

    const row = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE shop_id = ?${dateFilter}`,
      params
    );
    return row?.total ?? 0;
  },
};
