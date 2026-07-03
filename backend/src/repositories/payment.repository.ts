// backend/src/repositories/payment.repository.ts
import { prisma } from '../database/db';
import type { Prisma, Payment } from '@prisma/client';

export const paymentRepository = {
  async create(shopId: string, data: Omit<Prisma.PaymentUncheckedCreateInput, 'shopId'>): Promise<Payment> {
    return prisma.payment.create({
      data: {
        ...data,
        shopId,
      },
    });
  },

  async findById(shopId: string, id: string): Promise<Payment | null> {
    return prisma.payment.findFirst({
      where: { id, shopId, deletedAt: null },
    });
  },

  async delete(shopId: string, id: string, updatedBy?: string): Promise<Payment> {
    return prisma.payment.update({
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
      invoiceId?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<{ data: Payment[]; total: number }> {
    const { customerId, invoiceId, search = '', page = 1, pageSize = 10 } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PaymentWhereInput = {
      shopId,
      customerId: customerId || undefined,
      invoiceId: invoiceId || undefined,
      deletedAt: null,
      OR: search
        ? [
            { referenceNumber: { contains: search, mode: 'insensitive' } },
            { notes: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [data, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { paymentDate: 'desc' },
      }),
      prisma.payment.count({ where }),
    ]);

    return { data, total };
  },

  async getSumByInvoiceId(shopId: string, invoiceId: string): Promise<number> {
    const aggregate = await prisma.payment.aggregate({
      where: {
        shopId,
        invoiceId,
        deletedAt: null,
      },
      _sum: {
        amount: true,
      },
    });
    return aggregate._sum.amount || 0;
  },
};
