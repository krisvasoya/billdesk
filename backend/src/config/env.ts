// backend/src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('4000'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),
  DIRECT_URL: z.string().url('DIRECT_URL must be a valid PostgreSQL connection string').optional(),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters'),
  JWT_REFRESH_SECRET: z.string().min(8, 'JWT_REFRESH_SECRET must be at least 8 characters'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url('UPSTASH_REDIS_REST_URL must be a valid HTTPS URL').optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  AUTH_ENABLED: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
});

export type Env = z.infer<typeof envSchema>;

const parseEnv = (): Env => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables configuration:', result.error.format());
    throw new Error('Invalid environment variables config');
  }
  return result.data;
};

export const env = parseEnv();
