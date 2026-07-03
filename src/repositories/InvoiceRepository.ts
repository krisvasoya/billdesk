// src/repositories/InvoiceRepository.ts
import { getDatabase } from '../services/database/db';
import type { Invoice, InvoiceItem, PaginatedResult } from '../types';

const mapInvoiceRow = (row: Record<string, unknown>, items: InvoiceItem[] = []): Invoice => ({
  id: row.id as string,
  shopId: row.shop_id as string,
  customerId: row.customer_id as string,
  customerName: row.customer_name as string,
  buyerId: (row.buyer_id as string) || undefined,
  buyerName: (row.buyer_name as string) || undefined,
  invoiceNumber: row.invoice_number as string,
  invoiceDate: row.invoice_date as string,
  dueDate: (row.due_date as string) || undefined,
  subtotal: (row.subtotal as number) || 0,
  gst: (row.gst as number) || 0,
  discount: (row.discount as number) || 0,
  transport: (row.transport as number) || 0,
  packing: (row.packing as number) || 0,
  otherCharges: (row.other_charges as number) || 0,
  grandTotal: (row.grand_total as number) || 0,
  paidAmount: (row.paid_amount as number) || 0,
  advancePaid: (row.advance_paid as number) || 0,
  pendingAmount: (row.pending_amount as number) || 0,
  status: row.status as Invoice['status'],
  notes: (row.notes as string) || undefined,
  terms: (row.terms as string) || undefined,
  items,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
});

const mapItemRow = (row: Record<string, unknown>): InvoiceItem => ({
  id: row.id as string,
  invoiceId: row.invoice_id as string,
  productId: row.product_id as string,
  productName: row.product_name as string,
  description: (row.description as string) || undefined,
  altQuantity: row.alt_quantity !== null ? (row.alt_quantity as number) : undefined,
  altUnit: (row.alt_unit as string) || undefined,
  quantity: (row.quantity as number) || 1,
  unit: row.unit as string,
  rate: (row.rate as number) || 0,
  gst: (row.gst as number) || 0,
  discount: (row.discount as number) || 0,
  total: (row.total as number) || 0,
});

export const InvoiceRepository = {
  async getById(shopId: string, id: string): Promise<Invoice | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM invoices WHERE shop_id = ? AND id = ?',
      [shopId, id]
    );
    if (!row) return null;

    const itemRows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM invoice_items WHERE invoice_id = ?',
      [id]
    );

    return mapInvoiceRow(row, itemRows.map(mapItemRow));
  },

  async getAll(
    shopId: string,
    opts?: {
      search?: string;
      customerId?: string;
      buyerId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<PaginatedResult<Invoice>> {
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
    if (opts?.buyerId) {
      whereClauses.push('buyer_id = ?');
      params.push(opts.buyerId);
    }
    if (opts?.status) {
      whereClauses.push('status = ?');
      params.push(opts.status);
    }
    if (opts?.startDate) {
      whereClauses.push('invoice_date >= ?');
      params.push(opts.startDate);
    }
    if (opts?.endDate) {
      whereClauses.push('invoice_date <= ?');
      params.push(opts.endDate);
    }
    if (opts?.search) {
      const searchWild = `%${opts.search}%`;
      whereClauses.push('(invoice_number LIKE ? OR customer_name LIKE ? OR invoice_date LIKE ?)');
      params.push(searchWild, searchWild, searchWild);
    }

    const where = whereClauses.join(' AND ');

    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM invoices
       WHERE ${where}
       ORDER BY invoice_date DESC, invoice_number DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const countRow = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM invoices WHERE ${where}`,
      params
    );
    const total = countRow?.count ?? 0;

    return {
      data: rows.map(r => mapInvoiceRow(r)),
      total,
      page,
      pageSize,
      hasMore: offset + rows.length < total,
    };
  },

  async getNextInvoiceNumber(shopId: string, format: string = 'INV-{NUMBER}'): Promise<string> {
    const db = getDatabase();
    // Fetch last invoice number
    const lastRow = await db.getFirstAsync<{ invoice_number: string }>(
      `SELECT invoice_number FROM invoices
       WHERE shop_id = ? AND invoice_number LIKE ?
       ORDER BY invoice_date DESC, created_at DESC, invoice_number DESC
       LIMIT 1`,
      [shopId, format.replace('{NUMBER}', '%')]
    );

    let nextNumber = 1;
    if (lastRow) {
      // Try to extract digits
      const formatPrefix = format.split('{NUMBER}')[0];
      const numberStr = lastRow.invoice_number.replace(formatPrefix, '');
      const num = parseInt(numberStr, 10);
      if (!isNaN(num)) {
        nextNumber = num + 1;
      }
    }

    const paddedNum = nextNumber.toString().padStart(4, '0');
    return format.replace('{NUMBER}', paddedNum);
  },

  async create(
    shopId: string,
    id: string,
    data: Omit<Invoice, 'id' | 'shopId' | 'grandTotal' | 'pendingAmount' | 'createdAt' | 'updatedAt'>
  ): Promise<Invoice> {
    const db = getDatabase();
    const now = new Date().toISOString();

    // 1. Calculations
    const subtotal = data.subtotal || 0;
    const discount = data.discount || 0;
    const gst = data.gst || 0;
    const transport = data.transport || 0;
    const packing = data.packing || 0;
    const otherCharges = data.otherCharges || 0;
    const advancePaid = data.advancePaid || 0;
    const paidAmount = data.paidAmount || 0;
    const actualPaid = paidAmount === advancePaid ? 0 : paidAmount;

    const grandTotal = subtotal - discount + gst + transport + packing + otherCharges;
    const pendingAmount = Math.max(0, grandTotal - advancePaid - actualPaid);

    let status: Invoice['status'] = 'pending';
    if (pendingAmount === 0) {
      status = 'paid';
    } else if (actualPaid + advancePaid > 0) {
      status = 'partial';
    }

    // 2. Transaction
    await db.runAsync('BEGIN TRANSACTION;');
    try {
      // Create Invoice
      await db.runAsync(
        `INSERT INTO invoices (
          id, shop_id, customer_id, customer_name, buyer_id, buyer_name,
          invoice_number, invoice_date, due_date, subtotal, gst, discount,
          transport, packing, other_charges, grand_total, paid_amount, advance_paid, pending_amount,
          status, notes, terms, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, shopId, data.customerId, data.customerName, data.buyerId ?? null, data.buyerName ?? null,
          data.invoiceNumber, data.invoiceDate, data.dueDate ?? null, subtotal, gst, discount,
          transport, packing, otherCharges, grandTotal, actualPaid, advancePaid, pendingAmount,
          status, data.notes ?? null, data.terms ?? null, now, now
        ]
      );

      // Create Items
      for (const item of data.items) {
        await db.runAsync(
          `INSERT INTO invoice_items (
            id, invoice_id, product_id, product_name, description, alt_quantity, alt_unit,
            quantity, unit, rate, gst, discount, total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id, id, item.productId, item.productName, item.description ?? null, item.altQuantity ?? null, item.altUnit ?? null,
            item.quantity, item.unit, item.rate, item.gst, item.discount, item.total
          ]
        );

        // Deduct stock if product exists and stock tracking is on
        if (item.productId) {
          await db.runAsync(
            `UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ? AND shop_id = ? AND stock IS NOT NULL`,
            [item.quantity, now, item.productId, shopId]
          );
        }
      }

      await db.runAsync('COMMIT;');
    } catch (error) {
      await db.runAsync('ROLLBACK;');
      console.error('Invoice create failed:', error);
      throw error;
    }

    return (await this.getById(shopId, id))!;
  },

  async delete(shopId: string, id: string): Promise<void> {
    const db = getDatabase();
    const invoice = await this.getById(shopId, id);
    if (!invoice) return;

    await db.runAsync('BEGIN TRANSACTION;');
    try {
      // Revert stock changes
      for (const item of invoice.items) {
        if (item.productId) {
          await db.runAsync(
            `UPDATE products SET stock = stock + ? WHERE id = ? AND shop_id = ? AND stock IS NOT NULL`,
            [item.quantity, item.productId, shopId]
          );
        }
      }

      // Delete invoice items
      await db.runAsync('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);

      // Delete linked payments
      await db.runAsync('DELETE FROM payments WHERE invoice_id = ? AND shop_id = ?', [id, shopId]);

      // Delete invoice
      await db.runAsync('DELETE FROM invoices WHERE id = ? AND shop_id = ?', [id, shopId]);

      await db.runAsync('COMMIT;');
    } catch (error) {
      await db.runAsync('ROLLBACK;');
      console.error('Invoice deletion failed:', error);
      throw error;
    }
  },

  async duplicate(shopId: string, id: string): Promise<Invoice> {
    const source = await this.getById(shopId, id);
    if (!source) throw new Error('Invoice not found');

    const nextInvoiceNumber = await this.getNextInvoiceNumber(shopId);
    const newId = 'inv-' + Date.now();

    const itemsClean = source.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.rate,
      discount: item.discount,
      gst: item.gst,
      productName: item.productName,
      description: item.description,
      altQuantity: item.altQuantity,
      altUnit: item.altUnit,
    }));

    return this.create(shopId, newId, {
      customerId: source.customerId,
      customerName: source.customerName,
      buyerId: source.buyerId,
      buyerName: source.buyerName,
      invoiceNumber: nextInvoiceNumber,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: source.dueDate,
      subtotal: source.subtotal,
      discount: source.discount,
      gst: source.gst,
      transport: source.transport,
      packing: source.packing,
      otherCharges: source.otherCharges,
      advancePaid: 0,
      paidAmount: 0,
      notes: source.notes,
      terms: source.terms,
      items: itemsClean as any,
      status: 'pending',
    });
  }
};
