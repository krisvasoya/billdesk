// backend/src/repositories/customer.repository.ts
import { prisma } from '../database/db';
import type { Prisma, Customer } from '@prisma/client';

export interface CustomerWithOutstanding extends Customer {
  outstandingBalance: number;
  totalBilled: number;
  totalPaid: number;
}

export const customerRepository = {
  async create(shopId: string, data: Omit<Prisma.CustomerUncheckedCreateInput, 'shopId'>): Promise<Customer> {
    return prisma.customer.create({
      data: {
        ...data,
        shopId,
      },
    });
  },

  async findById(shopId: string, id: string): Promise<CustomerWithOutstanding | null> {
    const customer = await prisma.customer.findFirst({
      where: { id, shopId, deletedAt: null },
      include: {
        invoices: {
          where: { deletedAt: null },
          select: {
            grandTotal: true,
            paidAmount: true,
            pendingAmount: true,
          },
        },
      },
    });

    if (!customer) return null;

    const totalBilled = customer.invoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
    const totalPaid = customer.invoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
    const outstandingBalance = customer.openingBalance + (totalBilled - totalPaid);

    const { invoices, ...rest } = customer;

    return {
      ...rest,
      outstandingBalance,
      totalBilled,
      totalPaid,
    };
  },

  async update(shopId: string, id: string, data: Omit<Prisma.CustomerUpdateInput, 'shopId'>): Promise<Customer> {
    return prisma.customer.update({
      where: { id, shopId },
      data,
    });
  },

  async delete(shopId: string, id: string, updatedBy?: string): Promise<Customer> {
    return prisma.customer.update({
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
  ): Promise<{ data: CustomerWithOutstanding[]; total: number }> {
    const { search = '', page = 1, pageSize = 10 } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.CustomerWhereInput = {
      shopId,
      deletedAt: null,
      OR: search
        ? [
            { customerName: { contains: search, mode: 'insensitive' } },
            { mobile: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [rawCustomers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { customerName: 'asc' },
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
      prisma.customer.count({ where }),
    ]);

    const data: CustomerWithOutstanding[] = rawCustomers.map((cust) => {
      const totalBilled = cust.invoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
      const totalPaid = cust.invoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
      const outstandingBalance = cust.openingBalance + (totalBilled - totalPaid);

      const { invoices, ...rest } = cust;
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
