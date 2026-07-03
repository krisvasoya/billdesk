// backend/src/services/payment.service.ts
import { paymentRepository } from '../repositories/payment.repository';
import { invoiceRepository } from '../repositories/invoice.repository';
import { activityLogRepository } from '../repositories/activity-log.repository';
import { prisma } from '../database/db';
import { AppError } from '../errors/app-error';
import type { Prisma, Payment } from '@prisma/client';

export const paymentService = {
  async getPayments(
    shopId: string,
    params: { customerId?: string; invoiceId?: string; search?: string; page?: number; pageSize?: number }
  ): Promise<{ data: Payment[]; total: number }> {
    return paymentRepository.findAll(shopId, params);
  },

  async recordPayment(
    shopId: string,
    userId: string,
    data: Omit<Prisma.PaymentUncheckedCreateInput, 'shopId'>
  ): Promise<Payment> {
    return prisma.$transaction(async (tx) => {
      // 1. Double check invoice if linking
      if (data.invoiceId) {
        const invoice = await tx.invoice.findFirst({
          where: { id: data.invoiceId, shopId, deletedAt: null },
        });
        if (!invoice) {
          throw new AppError('Linked invoice not found', 404);
        }

        // Apply payment amount to invoice
        const newPaidAmount = invoice.paidAmount + data.amount;
        const newPendingAmount = Math.max(0, invoice.grandTotal - newPaidAmount);
        let newStatus = 'partial';

        if (newPendingAmount <= 0) {
          newStatus = 'paid';
        }

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: newPaidAmount,
            pendingAmount: newPendingAmount,
            paymentStatus: newStatus,
          },
        });
      }

      // 2. Create the payment record
      const payment = await tx.payment.create({
        data: {
          ...data,
          shopId,
        },
      });

      // 3. Log audit
      await tx.activityLog.create({
        data: {
          shopId,
          userId,
          action: 'PAYMENT_RECEIVED',
          details: `Logged payment of ${data.amount} via ${data.paymentMethod}`,
        },
      });

      return payment;
    });
  },

  async deletePayment(shopId: string, id: string, userId: string): Promise<Payment> {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id, shopId, deletedAt: null },
      });

      if (!payment) {
        throw new AppError('Payment not found', 404);
      }

      // 1. Revert payment amounts from linked invoice
      if (payment.invoiceId) {
        const invoice = await tx.invoice.findFirst({
          where: { id: payment.invoiceId, shopId, deletedAt: null },
        });

        if (invoice) {
          const revertedPaid = Math.max(0, invoice.paidAmount - payment.amount);
          const revertedPending = Math.min(invoice.grandTotal, invoice.pendingAmount + payment.amount);
          let revertedStatus = 'partial';

          if (revertedPaid === 0) {
            revertedStatus = 'pending';
          } else if (revertedPending === 0) {
            revertedStatus = 'paid';
          }

          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              paidAmount: revertedPaid,
              pendingAmount: revertedPending,
              paymentStatus: revertedStatus,
            },
          });
        }
      }

      // 2. Soft delete payment
      const deletedPayment = await tx.payment.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedBy: userId,
        },
      });

      // 3. Log audit
      await tx.activityLog.create({
        data: {
          shopId,
          userId,
          action: 'PAYMENT_DELETED',
          details: `Reverted payment of ${payment.amount} (ID: ${payment.id})`,
        },
      });

      return deletedPayment;
    });
  },
};
