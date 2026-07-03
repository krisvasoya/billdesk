// backend/src/validators/settings.validator.ts
import { z } from 'zod';

export const settingsSchema = z.object({
  invoiceNumberFormat: z.string().min(3, 'Format must contain at least 3 characters').optional(),
  currency: z.string().min(1).max(5).optional(),
  language: z.enum(['en', 'gu']).optional(),
  theme: z.enum(['light', 'dark']).optional(),
  upiId: z.string().regex(/^[\w.-]+@[\w.-]+$/, 'Invalid UPI ID format').optional().or(z.literal('')),
  bankDetails: z.string().optional(),
});
