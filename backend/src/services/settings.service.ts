// backend/src/services/settings.service.ts
import { settingsRepository } from '../repositories/settings.repository';
import { activityLogRepository } from '../repositories/activity-log.repository';
import type { Settings } from '@prisma/client';

export const settingsService = {
  async getSettings(shopId: string): Promise<Settings | null> {
    let settings = await settingsRepository.findByShopId(shopId);
    
    // Auto initialize default settings if not exists
    if (!settings) {
      settings = await settingsRepository.create(shopId, {
        invoiceNumberFormat: 'INV-{YYYY}-{NUMBER}',
        currency: 'INR',
        language: 'en',
        theme: 'light',
      });
    }
    return settings;
  },

  async updateSettings(
    shopId: string,
    userId: string,
    data: {
      invoiceNumberFormat?: string;
      currency?: string;
      language?: string;
      theme?: string;
      upiId?: string;
      bankDetails?: string;
    }
  ): Promise<Settings> {
    const settings = await settingsRepository.update(shopId, data);

    await activityLogRepository.log({
      shopId,
      userId,
      action: 'SETTINGS_UPDATED',
      details: 'Updated shop billing and bank preferences',
    });

    return settings;
  },
};
