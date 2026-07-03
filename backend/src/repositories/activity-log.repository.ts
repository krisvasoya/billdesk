// backend/src/repositories/activity-log.repository.ts
import { prisma } from '../database/db';
import type { Prisma, ActivityLog } from '@prisma/client';

export const activityLogRepository = {
  async log(data: Prisma.ActivityLogUncheckedCreateInput): Promise<ActivityLog> {
    return prisma.activityLog.create({ data });
  },

  async findAll(
    shopId: string,
    params: {
      userId?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<{ data: ActivityLog[]; total: number }> {
    const { userId, page = 1, pageSize = 15 } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ActivityLogWhereInput = {
      shopId,
      userId: userId || undefined,
      deletedAt: null,
    };

    const [data, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.activityLog.count({ where }),
    ]);

    return { data, total };
  },
};
