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
  deletedAt: row.deleted_at as string | undefined,
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
      'SELECT * FROM invoices WHERE shop_id = ? AND id = ? AND deleted_at IS NULL',
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

    const whereClauses = ['shop_id = ?', 'deleted_at IS NULL'];
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
      const searchWild = `%${opts.search.trim().toLowerCase()}%`;
      whereClauses.push('(LOWER(invoice_number) LIKE ? OR LOWER(customer_name) LIKE ? OR invoice_date LIKE ?)');
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
    const formatPrefix = format.split('{NUMBER}')[0];

    // Fetch matching invoice numbers for this shop to compute absolute max suffix
    const rows = await db.getAllAsync<{ invoice_number: string }>(
      `SELECT invoice_number FROM invoices 
       WHERE shop_id = ? AND invoice_number LIKE ? AND deleted_at IS NULL`,
      [shopId, formatPrefix + '%']
    );

    let maxNumber = 0;
    for (const r of rows) {
      const numberStr = r.invoice_number.replace(formatPrefix, '');
      const num = parseInt(numberStr, 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }

    const nextNumber = maxNumber + 1;
    const paddedNum = nextNumber.toString().padStart(4, '0');
    return format.replace('{NUMBER}', paddedNum);
  },

  async create(
    shopId: string,
    id: string,
    data: Omit<Invoice, 'id' | 'shopId' | 'grandTotal' | 'pendingAmount' | 'createdAt' | 'updatedAt' | 'deletedAt'> & {
      tempCustomer?: { name: string; mobile?: string; email?: string; address?: string; gstNumber?: string };
      tempBuyer?: { name: string; mobile?: string; email?: string; address?: string };
    }
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

    // 2. Wrap all database mutations inside a single atomic transaction block
    await db.runAsync('BEGIN TRANSACTION;');
    try {
      // Create Customer if temporary
      if (data.tempCustomer) {
        await db.runAsync(
          `INSERT INTO customers (id, shop_id, name, mobile, email, address, gst_number, opening_balance, credit_limit, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
          [data.customerId, shopId, data.tempCustomer.name, data.tempCustomer.mobile ?? null, data.tempCustomer.email ?? null, data.tempCustomer.address ?? null, data.tempCustomer.gstNumber ?? null, now, now]
        );
      }

      // Create Buyer if temporary
      if (data.tempBuyer) {
        await db.runAsync(
          `INSERT INTO buyers (id, shop_id, name, mobile, email, address, opening_balance, credit_limit, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
           [data.buyerId ?? null, shopId, data.tempBuyer.name, data.tempBuyer.mobile ?? null, data.tempBuyer.email ?? null, data.tempBuyer.address ?? null, now, now]
        );
      }

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

      // Create Items and update inventory
      for (const item of data.items) {
        let productId = item.productId;

        // If no productId but productName is given, look up or create the product inline
        if (!productId && item.productName) {
          const prodRow = await db.getFirstAsync<{ id: string }>(
            'SELECT id FROM products WHERE shop_id = ? AND LOWER(product_name) = ? AND deleted_at IS NULL LIMIT 1',
            [shopId, item.productName.trim().toLowerCase()]
          );
          if (prodRow) {
            productId = prodRow.id;
          } else {
            productId = 'prod-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
            await db.runAsync(
              `INSERT INTO products (id, shop_id, product_name, rate, gst, unit, stock, sku, barcode, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, null, null, null, ?, ?)`,
              [productId, shopId, item.productName.trim(), item.rate, item.gst, item.unit, now, now]
            );
          }
        }

        await db.runAsync(
          `INSERT INTO invoice_items (
            id, invoice_id, product_id, product_name, description, alt_quantity, alt_unit,
            quantity, unit, rate, gst, discount, total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id, id, productId ?? null, item.productName, item.description ?? null, item.altQuantity ?? null, item.altUnit ?? null,
            item.quantity, item.unit, item.rate, item.gst, item.discount, item.total
          ]
        );

        if (productId) {
          await db.runAsync(
            `UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ? AND shop_id = ? AND stock IS NOT NULL`,
            [item.quantity, now, productId, shopId]
          );
        }
      }

      await db.runAsync('COMMIT;');
    } catch (error) {
      await db.runAsync('ROLLBACK;');
      console.error('[BillDesk] Invoice transaction creation rolled back:', error);
      throw error;
    }

    return (await this.getById(shopId, id))!;
  },

  async delete(shopId: string, id: string): Promise<void> {
    const db = getDatabase();
    const invoice = await this.getById(shopId, id);
    if (!invoice) return;
    const now = new Date().toISOString();

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

      // Soft delete linked payments (set deleted_at)
      await db.runAsync('UPDATE payments SET deleted_at = ?, updated_at = ? WHERE invoice_id = ? AND shop_id = ?', [now, now, id, shopId]);

      // Soft delete invoice (set deleted_at)
      await db.runAsync('UPDATE invoices SET deleted_at = ?, updated_at = ? WHERE id = ? AND shop_id = ?', [now, now, id, shopId]);

      await db.runAsync('COMMIT;');
    } catch (error) {
      await db.runAsync('ROLLBACK;');
      console.error('[BillDesk] Invoice deletion transaction failed:', error);
      throw error;
    }
  },

  async duplicate(shopId: string, id: string): Promise<Invoice> {
    const source = await this.getById(shopId, id);
    if (!source) throw new Error('Invoice not found');

    const nextInvoiceNumber = await this.getNextInvoiceNumber(shopId);
    const newId = 'inv-' + Date.now();

    const itemsClean = source.items.map(item => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
      total: item.total,
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
