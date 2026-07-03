// backend/src/validators/auth.validator.ts
import { z } from 'zod';

export const registerSchema = z.object({
  shopName: z.string().min(2, 'Shop name must be at least 2 characters'),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits'),
  businessType: z.enum(['wholesaler', 'retailer', 'distributor', 'manufacturer']),
  passwordHash: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  passwordHash: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});
