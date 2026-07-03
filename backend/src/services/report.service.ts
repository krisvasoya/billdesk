// backend/src/services/report.service.ts
import { prisma } from '../database/db';
import { invoiceRepository } from '../repositories/invoice.repository';

export const reportService = {
  async getSalesReport(
    shopId: string,
    params: {
      startDate?: string;
      endDate?: string;
      interval?: 'day' | 'month';
    }
  ) {
    const { startDate, endDate, interval = 'day' } = params;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // default last 30 days
    const end = endDate ? new Date(endDate) : new Date();

    // Query active invoices in window
    const invoices = await prisma.invoice.findMany({
      where: {
        shopId,
        deletedAt: null,
        invoiceDate: { gte: start, lte: end },
      },
      select: {
        invoiceDate: true,
        grandTotal: true,
        paidAmount: true,
        pendingAmount: true,
      },
      orderBy: { invoiceDate: 'asc' },
    });

    // Aggregate by day or month
    const groups: Record<string, { label: string; totalSales: number; totalReceived: number; count: number }> = {};

    invoices.forEach((inv) => {
      let key = '';
      if (interval === 'day') {
        key = inv.invoiceDate.toISOString().split('T')[0]; // YYYY-MM-DD
      } else {
        const year = inv.invoiceDate.getFullYear();
        const month = String(inv.invoiceDate.getMonth() + 1).padStart(2, '0');
        key = `${year}-${month}`; // YYYY-MM
      }

      if (!groups[key]) {
        groups[key] = {
          label: key,
          totalSales: 0,
          totalReceived: 0,
          count: 0,
        };
      }

      groups[key].totalSales += inv.grandTotal;
      groups[key].totalReceived += inv.paidAmount;
      groups[key].count += 1;
    });

    const dataset = Object.values(groups).sort((a, b) => a.label.localeCompare(b.label));

    // Calculate aggregated statistics
    const stats = await invoiceRepository.getStats(shopId, start, end);

    return {
      stats,
      dataset,
    };
  },

  async getOutstandingBalanceReport(shopId: string) {
    // Get top customers with outstanding balances
    const customers = await prisma.customer.findMany({
      where: {
        shopId,
        deletedAt: null,
      },
      include: {
        invoices: {
          where: { deletedAt: null },
          select: {
            grandTotal: true,
            paidAmount: true,
          },
        },
      },
    });

    const outstandingDataset = customers
      .map((c) => {
        const billed = c.invoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
        const paid = c.invoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
        const outstanding = c.openingBalance + (billed - paid);
        return {
          customerId: c.id,
          customerName: c.customerName,
          mobile: c.mobile,
          outstandingBalance: outstanding,
        };
      })
      .filter((c) => c.outstandingBalance > 0)
      .sort((a, b) => b.outstandingBalance - a.outstandingBalance);

    const totalOutstanding = outstandingDataset.reduce((acc, c) => acc + c.outstandingBalance, 0);

    return {
      totalOutstanding,
      customers: outstandingDataset,
    };
  },
};
