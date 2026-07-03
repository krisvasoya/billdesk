// backend/src/validators/invoice.validator.ts
import { z } from 'zod';

export const invoiceItemSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  alternativeQuantity: z.number().positive().optional(),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required'),
  rate: z.number().positive('Rate must be greater than 0'),
  discount: z.number().nonnegative().default(0),
  gst: z.number().nonnegative().default(0),
});

export const invoiceSchema = z.object({
  customerId: z.string().uuid('Invalid customer UUID').optional().or(z.literal('')),
  buyerId: z.string().uuid('Invalid buyer UUID').optional().or(z.literal('')),
  invoiceDate: z.string().datetime('Invoice date must be a valid ISO DateTime string'),
  dueDate: z.string().datetime('Due date must be a valid ISO DateTime string').optional().or(z.literal('')),
  transportCharge: z.number().nonnegative().default(0),
  packingCharge: z.number().nonnegative().default(0),
  otherCharge: z.number().nonnegative().default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'Invoice must contain at least 1 item'),
}).refine(data => data.customerId || data.buyerId, {
  message: "Either customerId or buyerId must be provided",
  path: ["customerId"]
});
