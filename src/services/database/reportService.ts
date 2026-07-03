// src/services/database/reportService.ts
import { getDatabase } from './db';
import type { ReportData } from '../../types';

export type ReportPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth' | 'year' | 'custom';

export const getDateRange = (period: ReportPeriod, start?: string, end?: string) => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  switch (period) {
    case 'today':
      return { startDate: today, endDate: today };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      return { startDate: yStr, endDate: yStr };
    }
    case 'week': {
      const w = new Date(now);
      w.setDate(w.getDate() - 7);
      return { startDate: w.toISOString().split('T')[0], endDate: today };
    }
    case 'month': {
      const m = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: m.toISOString().split('T')[0], endDate: today };
    }
    case 'lastMonth': {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lme = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: lm.toISOString().split('T')[0], endDate: lme.toISOString().split('T')[0] };
    }
    case 'year': {
      const yr = new Date(now.getFullYear(), 0, 1);
      return { startDate: yr.toISOString().split('T')[0], endDate: today };
    }
    case 'custom':
      return { startDate: start ?? today, endDate: end ?? today };
    default:
      return { startDate: today, endDate: today };
  }
};

export const reportService = {
  async getFullReport(shopId: string, period: ReportPeriod, customStart?: string, customEnd?: string): Promise<ReportData> {
    const db = getDatabase();
    const { startDate, endDate } = getDateRange(period, customStart, customEnd);

    // Overall stats
    const statsRow = await db.getFirstAsync<Record<string, number>>(
      `SELECT
        COALESCE(SUM(grand_total), 0) as total_sales,
        COALESCE(SUM(paid_amount), 0) as total_received,
        COALESCE(SUM(pending_amount), 0) as total_outstanding,
        COUNT(*) as total_invoices
       FROM invoices
       WHERE shop_id = ? AND invoice_date >= ? AND invoice_date <= ?`,
      [shopId, startDate, endDate]
    );

    // Customer count (total, not filtered)
    const customerCountRow = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM customers WHERE shop_id = ?',
      [shopId]
    );

    // Payment by method
    const paymentRows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT payment_mode, COALESCE(SUM(amount), 0) as total
       FROM payments
       WHERE shop_id = ? AND payment_date >= ? AND payment_date <= ?
       GROUP BY payment_mode`,
      [shopId, startDate, endDate]
    );
    const paymentByMethod: Record<string, number> = {};
    for (const row of paymentRows) {
      paymentByMethod[row.payment_mode as string] = row.total as number;
    }

    // Top customers by billing
    const topCustomerRows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT c.name,
        COALESCE(SUM(i.grand_total), 0) as total,
        COALESCE(SUM(i.pending_amount), 0) as outstanding
       FROM customers c
       LEFT JOIN invoices i ON i.customer_id = c.id AND i.invoice_date >= ? AND i.invoice_date <= ?
       WHERE c.shop_id = ?
       GROUP BY c.id
       ORDER BY total DESC
       LIMIT 10`,
      [startDate, endDate, shopId]
    );

    const topCustomers = topCustomerRows.map(row => ({
      name: row.name as string,
      total: row.total as number,
      outstanding: row.outstanding as number,
    }));

    // GST summary by rate
    const gstRows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT ii.gst as rate,
        COALESCE(SUM(ii.quantity * ii.rate - ii.discount), 0) as taxable,
        COALESCE(SUM(ii.total - (ii.quantity * ii.rate - ii.discount)), 0) as tax
       FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       WHERE i.shop_id = ? AND i.invoice_date >= ? AND i.invoice_date <= ? AND ii.gst > 0
       GROUP BY ii.gst
       ORDER BY ii.gst ASC`,
      [shopId, startDate, endDate]
    );

    const gstSummary = gstRows.map(row => ({
      rate: row.rate as number,
      taxable: row.taxable as number,
      tax: row.tax as number,
    }));

    const periodLabel = `${startDate} to ${endDate}`;

    return {
      period: periodLabel,
      totalSales: statsRow?.total_sales ?? 0,
      totalReceived: statsRow?.total_received ?? 0,
      totalOutstanding: statsRow?.total_outstanding ?? 0,
      totalInvoices: statsRow?.total_invoices ?? 0,
      totalCustomers: customerCountRow?.count ?? 0,
      paymentByMethod,
      topCustomers,
      gstSummary,
    };
  },

  async getMonthlyTrend(shopId: string): Promise<{ month: string; sales: number; received: number }[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT
        strftime('%Y-%m', invoice_date) as month,
        COALESCE(SUM(grand_total), 0) as sales,
        COALESCE(SUM(paid_amount), 0) as received
       FROM invoices
       WHERE shop_id = ? AND invoice_date >= date('now', '-12 months')
       GROUP BY strftime('%Y-%m', invoice_date)
       ORDER BY month ASC`,
      [shopId]
    );

    return rows.map(row => ({
      month: row.month as string,
      sales: row.sales as number,
      received: row.received as number,
    }));
  },
};
