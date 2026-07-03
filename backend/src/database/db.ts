// backend/src/database/db.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { env } from '../config/env';

declare global {
  // eslint-disable-next-line no-var
  var prismaPgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var prismaClient: PrismaClient | undefined;
}

// Ensure database pool and client reuse to prevent exhausting connection limits
const connectionString = env.DATABASE_URL;

const pool = globalThis.prismaPgPool || new Pool({ connectionString });
const adapter = new PrismaPg(pool);
export const prisma = globalThis.prismaClient || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaPgPool = pool;
  globalThis.prismaClient = prisma;
}

export default prisma;
