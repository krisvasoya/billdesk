// backend/src/validators/payment.validator.ts
import { z } from 'zod';

export const paymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice UUID').optional().or(z.literal('')),
  customerId: z.string().uuid('Invalid customer UUID').optional().or(z.literal('')),
  amount: z.number().positive('Payment amount must be greater than 0'),
  paymentMethod: z.enum(['cash', 'upi', 'bank', 'cheque', 'card']),
  paymentDate: z.string().datetime('Payment date must be a valid ISO DateTime string'),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => data.invoiceId || data.customerId, {
  message: "Either invoiceId or customerId must be provided to link the payment",
  path: ["customerId"]
});
