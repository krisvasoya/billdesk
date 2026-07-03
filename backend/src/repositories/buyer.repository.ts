// backend/src/repositories/buyer.repository.ts
import { prisma } from '../database/db';
import type { Prisma, Buyer } from '@prisma/client';

export interface BuyerWithOutstanding extends Buyer {
  outstandingBalance: number;
  totalBilled: number;
  totalPaid: number;
}

export const buyerRepository = {
  async create(shopId: string, data: Omit<Prisma.BuyerUncheckedCreateInput, 'shopId'>): Promise<Buyer> {
    return prisma.buyer.create({
      data: {
        ...data,
        shopId,
      },
    });
  },

  async findById(shopId: string, id: string): Promise<BuyerWithOutstanding | null> {
    const buyer = await prisma.buyer.findFirst({
      where: { id, shopId, deletedAt: null },
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

    if (!buyer) return null;

    const totalBilled = buyer.invoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
    const totalPaid = buyer.invoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
    const outstandingBalance = buyer.openingBalance + (totalBilled - totalPaid);

    const { invoices, ...rest } = buyer;

    return {
      ...rest,
      outstandingBalance,
      totalBilled,
      totalPaid,
    };
  },

  async update(shopId: string, id: string, data: Omit<Prisma.BuyerUpdateInput, 'shopId'>): Promise<Buyer> {
    return prisma.buyer.update({
      where: { id, shopId },
      data,
    });
  },

  async delete(shopId: string, id: string, updatedBy?: string): Promise<Buyer> {
    return prisma.buyer.update({
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
      search?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<{ data: BuyerWithOutstanding[]; total: number }> {
    const { search = '', page = 1, pageSize = 10 } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.BuyerWhereInput = {
      shopId,
      deletedAt: null,
      OR: search
        ? [
            { buyerName: { contains: search, mode: 'insensitive' } },
            { mobile: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [rawBuyers, total] = await Promise.all([
      prisma.buyer.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { buyerName: 'asc' },
        include: {
          invoices: {
            where: { deletedAt: null },
            select: {
              grandTotal: true,
              paidAmount: true,
            },
          },
        },
      }),
      prisma.buyer.count({ where }),
    ]);

    const data: BuyerWithOutstanding[] = rawBuyers.map((b) => {
      const totalBilled = b.invoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
      const totalPaid = b.invoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
      const outstandingBalance = b.openingBalance + (totalBilled - totalPaid);

      const { invoices, ...rest } = b;
      return {
        ...rest,
        outstandingBalance,
        totalBilled,
        totalPaid,
      };
    });

    return { data, total };
  },
};
