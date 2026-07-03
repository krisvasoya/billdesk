// backend/src/repositories/invoice.repository.ts
import { prisma } from '../database/db';
import type { Prisma, Invoice, InvoiceItem } from '@prisma/client';

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
}

export const invoiceRepository = {
  async create(
    shopId: string,
    invoiceData: Omit<Prisma.InvoiceUncheckedCreateInput, 'shopId' | 'grandTotal' | 'pendingAmount' | 'paidAmount' | 'subtotal' | 'discount' | 'gst'>,
    itemsData: Omit<Prisma.InvoiceItemUncheckedCreateInput, 'invoiceId' | 'total'>[]
  ): Promise<InvoiceWithItems> {
    return prisma.$transaction(async (tx) => {
      // 1. Calculate values for each item and sum them
      let subtotal = 0;
      let gstTotal = 0;
      let discountTotal = 0;

      const processedItems = itemsData.map((item) => {
        const itemSubtotal = item.rate * item.quantity;
        const itemDiscount = item.discount || 0;
        const baseAmount = itemSubtotal - itemDiscount;
        const itemGst = (baseAmount * (item.gst || 0)) / 100;
        const itemTotal = baseAmount + itemGst;

        subtotal += itemSubtotal;
        gstTotal += itemGst;
        discountTotal += itemDiscount;

        return {
          ...item,
          total: itemTotal,
        };
      });

      const grandTotal =
        subtotal -
        discountTotal +
        gstTotal +
        (invoiceData.transportCharge || 0) +
        (invoiceData.packingCharge || 0) +
        (invoiceData.otherCharge || 0);

      // 2. Create the invoice
      const invoice = await tx.invoice.create({
        data: {
          ...invoiceData,
          shopId,
          subtotal,
          discount: discountTotal,
          gst: gstTotal,
          grandTotal,
          pendingAmount: grandTotal,
          paidAmount: 0.0,
          paymentStatus: 'pending',
        },
      });

      // 3. Create items
      const createdItems = await Promise.all(
        processedItems.map((item) =>
          tx.invoiceItem.create({
            data: {
              ...item,
              invoiceId: invoice.id,
            },
          })
        )
      );

      return {
        ...invoice,
        items: createdItems,
      };
    });
  },

  async findById(shopId: string, id: string): Promise<InvoiceWithItems | null> {
    return prisma.invoice.findFirst({
      where: { id, shopId, deletedAt: null },
      include: {
        items: {
          where: { deletedAt: null },
        },
      },
    }) as Promise<InvoiceWithItems | null>;
  },

  async findNextInvoiceNumber(shopId: string): Promise<string> {
    const lastInvoice = await prisma.invoice.findFirst({
      where: { shopId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { invoiceNumber: true },
    });

    if (!lastInvoice) {
      return 'INV-2026-0001';
    }

    // Attempt to extract the trailing number
    const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
    if (!match) {
      return 'INV-2026-0001';
    }

    const nextNum = parseInt(match[1]) + 1;
    const prefix = lastInvoice.invoiceNumber.substring(0, lastInvoice.invoiceNumber.length - match[1].length);
    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  },

  async updatePayment(
    shopId: string,
    id: string,
    paymentAmount: number
  ): Promise<Invoice> {
    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id, shopId, deletedAt: null },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const newPaidAmount = invoice.paidAmount + paymentAmount;
      const newPendingAmount = Math.max(0, invoice.grandTotal - newPaidAmount);
      let newStatus = 'partial';

      if (newPendingAmount <= 0) {
        newStatus = 'paid';
      } else if (newPaidAmount === 0) {
        newStatus = 'pending';
      }

      return tx.invoice.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          pendingAmount: newPendingAmount,
          paymentStatus: newStatus,
        },
      });
    });
  },

  async delete(shopId: string, id: string, updatedBy?: string): Promise<Invoice> {
    return prisma.invoice.update({
      where: { id, shopId },
      data: {
        deletedAt: new Date(),
        updatedBy,
      },
    });
  },

  async findAll(
    shopId: string,
    params: {
      customerId?: string;
      buyerId?: string;
      status?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<{ data: Invoice[]; total: number }> {
    const { customerId, buyerId, status, search = '', page = 1, pageSize = 10 } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.InvoiceWhereInput = {
      shopId,
      customerId: customerId || undefined,
      buyerId: buyerId || undefined,
      paymentStatus: status || undefined,
      deletedAt: null,
      OR: search
        ? [
            { invoiceNumber: { contains: search, mode: 'insensitive' } },
            { customer: { customerName: { contains: search, mode: 'insensitive' } } },
            { buyer: { buyerName: { contains: search, mode: 'insensitive' } } },
          ]
        : undefined,
    };

    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { invoiceDate: 'desc' },
      }),
      prisma.invoice.count({ where }),
    ]);

    return { data, total };
  },

  async getStats(
    shopId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalSales: number;
    totalReceived: number;
    totalOutstanding: number;
    totalInvoices: number;
  }> {
    const where: Prisma.InvoiceWhereInput = {
      shopId,
      deletedAt: null,
      invoiceDate: startDate && endDate ? { gte: startDate, lte: endDate } : undefined,
    };

    const [aggregations, count] = await Promise.all([
      prisma.invoice.aggregate({
        where,
        _sum: {
          grandTotal: true,
          paidAmount: true,
          pendingAmount: true,
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      totalSales: aggregations._sum.grandTotal || 0,
      totalReceived: aggregations._sum.paidAmount || 0,
      totalOutstanding: aggregations._sum.pendingAmount || 0,
      totalInvoices: count,
    };
  },
};
