// src/services/database/invoiceService.ts
import { InvoiceRepository } from '../../repositories/InvoiceRepository';
import { generateId, getDatabase } from './db';
import type { Invoice, InvoiceItem, InvoiceStatus, PaginatedResult } from '../../types';
import { syncService } from '../syncService';
import { InvoiceCalculationService } from '../invoiceCalculationService';

const mapInvoiceToLegacy = (invoice: Invoice): Invoice => {
  return invoice; // Directly return camelCase object matching standardized schemas
};

export const invoiceService = {
  async getAll(
    shopId: string,
    opts?: {
      search?: string;
      status?: InvoiceStatus;
      customerId?: string;
      buyerId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<PaginatedResult<Invoice>> {
    const res = await InvoiceRepository.getAll(shopId, {
      ...opts,
      startDate: opts?.startDate,
      endDate: opts?.endDate,
    });
    return {
      ...res,
      data: res.data.map(mapInvoiceToLegacy),
    };
  },

  async getById(shopId: string, id: string): Promise<Invoice | null> {
    const invoice = await InvoiceRepository.getById(shopId, id);
    return invoice ? mapInvoiceToLegacy(invoice) : null;
  },

  async getNextInvoiceNumber(shopId: string, format: string = 'INV-{NUMBER}'): Promise<string> {
    return InvoiceRepository.getNextInvoiceNumber(shopId, format);
  },

  async create(
    shopId: string,
    data: {
      customerId: string;
      customerName: string;
      buyerId?: string;
      buyerName?: string;
      date: string;
      dueDate?: string;
      items: {
        productId?: string;
        productName: string;
        description?: string;
        altQuantity?: number;
        altUnit?: string;
        quantity: number;
        unit: string;
        rate: number;
        gst?: number;
        discount?: number;
      }[];
      transportCharge?: number;
      packingCharge?: number;
      otherCharge?: number;
      advancePayment?: number;
      notes?: string;
      terms?: string;
      tempCustomer?: { name: string; mobile?: string; email?: string; address?: string; gstNumber?: string };
      tempBuyer?: { name: string; mobile?: string; email?: string; address?: string };
      status?: InvoiceStatus;
    }
  ): Promise<Invoice> {
    const id = generateId();

    const mappedItems: InvoiceItem[] = data.items.map(item => {
      const rate = item.rate || 0;
      const quantity = item.quantity || 1;
      const discount = item.discount || 0;
      const gst = item.gst || 0;

      const { total } = InvoiceCalculationService.calculateItem({ rate, quantity, discount, gst });

      return {
        id: generateId(),
        invoiceId: id,
        productId: item.productId,
        productName: item.productName,
        description: item.description,
        altQuantity: item.altQuantity,
        altUnit: item.altUnit,
        quantity,
        unit: item.unit,
        rate,
        gst,
        discount,
        total,
      };
    });

    const transport = data.transportCharge ?? 0;
    const packing = data.packingCharge ?? 0;
    const otherCharges = data.otherCharge ?? 0;
    const advancePaid = data.advancePayment ?? 0;

    const { subtotal, discount, gst } = InvoiceCalculationService.calculateInvoice({
      items: mappedItems,
      transport,
      packing,
      otherCharges,
      advancePaid,
      paidAmount: 0,
    });

    const dbInvoice = await InvoiceRepository.create(shopId, id, {
      customerId: data.customerId,
      customerName: data.customerName,
      buyerId: data.buyerId,
      buyerName: data.buyerName,
      invoiceNumber: await this.getNextInvoiceNumber(shopId),
      invoiceDate: data.date,
      dueDate: data.dueDate,
      subtotal,
      discount,
      gst,
      transport,
      packing,
      otherCharges,
      advancePaid,
      paidAmount: 0,
      status: data.status || 'pending',
      notes: data.notes,
      terms: data.terms,
      items: mappedItems,
      tempCustomer: data.tempCustomer,
      tempBuyer: data.tempBuyer,
    });

    const legacyInvoice = mapInvoiceToLegacy(dbInvoice);
    await syncService.queueOperation('invoice', id, 'create', legacyInvoice).catch(err => {
      console.warn('[BillDesk] Queue operation failed for invoice creation:', err);
    });
    return legacyInvoice;
  },

  async update(
    shopId: string,
    id: string,
    data: {
      customerId?: string;
      customerName?: string;
      buyerId?: string;
      buyerName?: string;
      date?: string;
      dueDate?: string;
      items?: Omit<InvoiceItem, 'id' | 'invoiceId' | 'amount'>[];
      transportCharge?: number;
      packingCharge?: number;
      otherCharge?: number;
      advancePayment?: number;
      notes?: string;
      terms?: string;
      status?: InvoiceStatus;
    }
  ): Promise<Invoice> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const existing = await InvoiceRepository.getById(shopId, id);
    if (!existing) throw new Error('Invoice not found');

    await db.runAsync('BEGIN TRANSACTION;');
    try {
      if (data.status) {
        await db.runAsync(
          'UPDATE invoices SET status = ?, updated_at = ? WHERE id = ? AND shop_id = ?',
          [data.status, now, id, shopId]
        );
      }
      if (data.notes !== undefined) {
        await db.runAsync(
          'UPDATE invoices SET notes = ?, updated_at = ? WHERE id = ? AND shop_id = ?',
          [data.notes, now, id, shopId]
        );
      }
      if (data.terms !== undefined) {
        await db.runAsync(
          'UPDATE invoices SET terms = ?, updated_at = ? WHERE id = ? AND shop_id = ?',
          [data.terms, now, id, shopId]
        );
      }
      await db.runAsync('COMMIT;');
    } catch (e) {
      await db.runAsync('ROLLBACK;');
      throw e;
    }

    const updated = (await InvoiceRepository.getById(shopId, id))!;
    const legacyInvoice = mapInvoiceToLegacy(updated);
    await syncService.queueOperation('invoice', id, 'update', legacyInvoice).catch(err => {
      console.warn('[BillDesk] Queue operation failed for invoice update:', err);
    });
    return legacyInvoice;
  },

  async addPayment(shopId: string, id: string, amount: number): Promise<Invoice> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const invoice = await InvoiceRepository.getById(shopId, id);
    if (!invoice) throw new Error('Invoice not found');

    const newPaidAmount = invoice.paidAmount + amount;
    const totalPaid = newPaidAmount + invoice.advancePaid;
    const pendingAmount = Math.max(0, invoice.grandTotal - totalPaid);

    let status: InvoiceStatus = 'pending';
    if (pendingAmount === 0) {
      status = 'paid';
    } else if (totalPaid > 0) {
      status = 'partial';
    }

    await db.runAsync(
      `UPDATE invoices SET paid_amount = ?, pending_amount = ?, status = ?, updated_at = ?
       WHERE id = ? AND shop_id = ?`,
      [newPaidAmount, pendingAmount, status, now, id, shopId]
    );

    const updated = (await InvoiceRepository.getById(shopId, id))!;
    const legacyInvoice = mapInvoiceToLegacy(updated);
    await syncService.queueOperation('invoice', id, 'update', legacyInvoice).catch(err => {
      console.warn('[BillDesk] Queue operation failed for invoice payment update:', err);
    });
    return legacyInvoice;
  },

  async delete(shopId: string, id: string): Promise<void> {
    try {
      await InvoiceRepository.delete(shopId, id);
      await syncService.queueOperation('invoice', id, 'delete', { id }).catch(err => {
        console.warn('[BillDesk] Queue operation failed for invoice delete:', err);
      });
    } catch (e) {
      console.error('[BillDesk] SQLite invoice delete service error:', e);
      throw e;
    }
  },

  async getStats(shopId: string, startDate?: string, endDate?: string): Promise<any> {
    const db = getDatabase();
    const params: string[] = [shopId];
    let dateFilter = ' AND deleted_at IS NULL';
    if (startDate) { dateFilter += ' AND invoice_date >= ?'; params.push(startDate); }
    if (endDate) { dateFilter += ' AND invoice_date <= ?'; params.push(endDate); }

    const row = await db.getFirstAsync<Record<string, number>>(
      `SELECT
        COALESCE(SUM(grand_total), 0) as total_sales,
        COALESCE(SUM(pending_amount), 0) as total_outstanding,
        COALESCE(SUM(paid_amount + advance_paid), 0) as total_received,
        COUNT(*) as total_invoices,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_invoices,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_invoices
       FROM invoices WHERE shop_id = ?${dateFilter}`,
      params
    );

    // Today's sales
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRow = await db.getFirstAsync<Record<string, number>>(
      `SELECT COALESCE(SUM(grand_total), 0) as today_sales FROM invoices WHERE shop_id = ? AND invoice_date = ? AND deleted_at IS NULL`,
      [shopId, todayStr]
    );

    // Customer count
    const custRow = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM customers WHERE shop_id = ? AND deleted_at IS NULL',
      [shopId]
    );

    // Buyer count
    const buyerRow = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM buyers WHERE shop_id = ? AND deleted_at IS NULL',
      [shopId]
    );

    return {
      totalSales: row?.total_sales ?? 0,
      totalOutstanding: row?.total_outstanding ?? 0,
      totalReceived: row?.total_received ?? 0,
      totalInvoices: row?.total_invoices ?? 0,
      pendingInvoices: row?.pending_invoices ?? 0,
      overdueInvoices: row?.overdue_invoices ?? 0,
      todaySales: todayRow?.today_sales ?? 0,
      totalCustomers: custRow?.count ?? 0,
      totalBuyers: buyerRow?.count ?? 0,
    };
  },

  async duplicate(shopId: string, id: string): Promise<Invoice> {
    try {
      const created = await InvoiceRepository.duplicate(shopId, id);
      const legacy = mapInvoiceToLegacy(created);
      await syncService.queueOperation('invoice', created.id, 'create', legacy).catch(err => {
        console.warn('[BillDesk] Queue operation failed for duplicated invoice:', err);
      });
      return legacy;
    } catch (e) {
      console.error('[BillDesk] SQLite duplicate invoice service error:', e);
      throw e;
    }
  },
};
