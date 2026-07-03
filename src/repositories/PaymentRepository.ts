// src/repositories/PaymentRepository.ts
import { getDatabase } from '../services/database/db';
import type { Payment, PaginatedResult } from '../types';

const mapRow = (row: Record<string, unknown>): Payment => ({
  id: row.id as string,
  shopId: row.shop_id as string,
  customerId: row.customer_id as string,
  customerName: row.customer_name as string,
  invoiceId: (row.invoice_id as string) || undefined,
  invoiceNumber: (row.invoice_number as string) || undefined,
  amount: (row.amount as number) || 0,
  paymentMode: row.payment_mode as Payment['paymentMode'],
  paymentDate: row.payment_date as string,
  notes: (row.notes as string) || undefined,
  createdAt: row.created_at as string,
});

export const PaymentRepository = {
  async getById(shopId: string, id: string): Promise<Payment | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM payments WHERE shop_id = ? AND id = ?',
      [shopId, id]
    );
    return row ? mapRow(row) : null;
  },

  async getAll(
    shopId: string,
    opts?: {
      search?: string;
      customerId?: string;
      invoiceId?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<PaginatedResult<Payment>> {
    const db = getDatabase();
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const whereClauses = ['shop_id = ?'];
    const params: (string | number)[] = [shopId];

    if (opts?.customerId) {
      whereClauses.push('customer_id = ?');
      params.push(opts.customerId);
    }
    if (opts?.invoiceId) {
      whereClauses.push('invoice_id = ?');
      params.push(opts.invoiceId);
    }
    if (opts?.search) {
      const searchWild = `%${opts.search}%`;
      whereClauses.push('(customer_name LIKE ? OR invoice_number LIKE ? OR payment_mode LIKE ?)');
      params.push(searchWild, searchWild, searchWild);
    }

    const where = whereClauses.join(' AND ');

    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM payments
       WHERE ${where}
       ORDER BY payment_date DESC, created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const countRow = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM payments WHERE ${where}`,
      params
    );
    const total = countRow?.count ?? 0;

    return {
      data: rows.map(mapRow),
      total,
      page,
      pageSize,
      hasMore: offset + rows.length < total,
    };
  },

  async create(
    shopId: string,
    id: string,
    data: Omit<Payment, 'id' | 'shopId' | 'createdAt'>
  ): Promise<Payment> {
    const db = getDatabase();
    const now = new Date().toISOString();

    await db.runAsync('BEGIN TRANSACTION;');
    try {
      // 1. Insert payment row
      await db.runAsync(
        `INSERT INTO payments (id, shop_id, invoice_id, invoice_number, customer_id, customer_name, amount, payment_mode, payment_date, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, shopId, data.invoiceId ?? null, data.invoiceNumber ?? null, data.customerId, data.customerName,
          data.amount, data.paymentMode, data.paymentDate, data.notes ?? null, now
        ]
      );

      // 2. If payment is linked to an invoice, update the invoice paid amount & status
      if (data.invoiceId) {
        const invoice = await db.getFirstAsync<{ grand_total: number; paid_amount: number; advance_paid: number }>(
          'SELECT grand_total, paid_amount, advance_paid FROM invoices WHERE id = ? AND shop_id = ?',
          [data.invoiceId, shopId]
        );

        if (invoice) {
          const newPaidAmount = invoice.paid_amount + data.amount;
          const totalPaid = newPaidAmount + invoice.advance_paid;
          const pendingAmount = Math.max(0, invoice.grand_total - totalPaid);

          let status: Payment['invoiceNumber'] = 'pending';
          if (pendingAmount === 0) {
            status = 'paid';
          } else if (totalPaid > 0) {
            status = 'partial';
          }

          await db.runAsync(
            `UPDATE invoices SET
              paid_amount = ?,
              pending_amount = ?,
              status = ?,
              updated_at = ?
             WHERE id = ? AND shop_id = ?`,
            [newPaidAmount, pendingAmount, status, now, data.invoiceId, shopId]
          );
        }
      }

      await db.runAsync('COMMIT;');
    } catch (error) {
      await db.runAsync('ROLLBACK;');
      console.error('Payment creation failed:', error);
      throw error;
    }

    return (await this.getById(shopId, id))!;
  },

  async delete(shopId: string, id: string): Promise<void> {
    const db = getDatabase();
    const payment = await this.getById(shopId, id);
    if (!payment) return;

    await db.runAsync('BEGIN TRANSACTION;');
    try {
      // 1. If payment is linked to an invoice, revert the invoice paid amount
      if (payment.invoiceId) {
        const invoice = await db.getFirstAsync<{ grand_total: number; paid_amount: number; advance_paid: number }>(
          'SELECT grand_total, paid_amount, advance_paid FROM invoices WHERE id = ? AND shop_id = ?',
          [payment.invoiceId, shopId]
        );

        if (invoice) {
          const newPaidAmount = Math.max(0, invoice.paid_amount - payment.amount);
          const totalPaid = newPaidAmount + invoice.advance_paid;
          const pendingAmount = Math.max(0, invoice.grand_total - totalPaid);

          let status = 'pending';
          if (pendingAmount === 0) {
            status = 'paid';
          } else if (totalPaid > 0) {
            status = 'partial';
          }

          await db.runAsync(
            `UPDATE invoices SET
              paid_amount = ?,
              pending_amount = ?,
              status = ?,
              updated_at = ?
             WHERE id = ? AND shop_id = ?`,
            [newPaidAmount, pendingAmount, status, new Date().toISOString(), payment.invoiceId, shopId]
          );
        }
      }

      // 2. Delete payment row
      await db.runAsync(
        'DELETE FROM payments WHERE id = ? AND shop_id = ?',
        [id, shopId]
      );

      await db.runAsync('COMMIT;');
    } catch (error) {
      await db.runAsync('ROLLBACK;');
      console.error('Payment deletion failed:', error);
      throw error;
    }
  }
};
