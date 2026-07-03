// backend/src/validators/customer.validator.ts
import { z } from 'zod';

export const customerSchema = z.object({
  customerName: z.string().min(2, 'Name must be at least 2 characters'),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile must be exactly 10 digits').optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST format (e.g. 24ABCDE1234F1Z5)').optional().or(z.literal('')),
  openingBalance: z.number().nonnegative('Opening balance cannot be negative').default(0),
  creditLimit: z.number().nonnegative('Credit limit cannot be negative').default(0),
  notes: z.string().optional(),
});

export const buyerSchema = z.object({
  buyerName: z.string().min(2, 'Name must be at least 2 characters'),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile must be exactly 10 digits').optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST format (e.g. 24ABCDE1234F1Z5)').optional().or(z.literal('')),
  openingBalance: z.number().nonnegative('Opening balance cannot be negative').default(0),
  creditLimit: z.number().nonnegative('Credit limit cannot be negative').default(0),
  notes: z.string().optional(),
});
