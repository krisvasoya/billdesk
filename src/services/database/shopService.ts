// src/services/database/shopService.ts
import { ShopRepository } from '../../repositories/ShopRepository';
import { generateId } from './db';
import type { Shop } from '../../types';

const mapShopToLegacy = (shop: Shop): any => {
  if (!shop) return null;
  return {
    ...shop,
    name: shop.shopName,
    mobile: shop.phone,
    logoUrl: shop.logo,
  };
};

export const shopService = {
  async getById(id: string): Promise<any | null> {
    const shop = await ShopRepository.getById(id);
    return shop ? mapShopToLegacy(shop) : null;
  },

  async create(
    data: {
      name: string;
      ownerName: string;
      email: string;
      mobile: string;
      businessType: string;
      address?: string;
      logoUrl?: string;
      gst?: string;
      ownerId?: string;
      invoiceNumberFormat?: string;
      currency?: string;
      language?: string;
      theme?: string;
    }
  ): Promise<any> {
    const id = generateId();
    try {
      const createdShop = await ShopRepository.create(id, {
        ownerId: data.ownerId,
        shopName: data.name,
        ownerName: data.ownerName,
        email: data.email,
        phone: data.mobile,
        businessType: data.businessType,
        address: data.address,
        logo: data.logoUrl,
        gst: data.gst,
      });

      // Update remaining configurations if passed
      if (data.invoiceNumberFormat || data.currency || data.language || data.theme) {
        await ShopRepository.update(id, {
          invoiceNumberFormat: data.invoiceNumberFormat,
          currency: data.currency,
          language: data.language,
          theme: data.theme,
        });
      }

      const shop = await ShopRepository.getById(id);
      return mapShopToLegacy(shop!);
    } catch (e) {
      console.error('SQLite shop insert service error:', e);
      throw e;
    }
  },

  async update(id: string, data: Partial<Omit<Shop, 'id' | 'createdAt'>>): Promise<any> {
    try {
      const updatedShop = await ShopRepository.update(id, {
        ownerId: data.ownerId,
        shopName: (data as any).name,
        ownerName: data.ownerName,
        businessType: data.businessType,
        address: data.address,
        logo: (data as any).logoUrl,
        phone: (data as any).mobile,
        email: data.email,
        gst: data.gst,
        upiId: data.upiId,
        bankDetails: data.bankDetails,
        invoiceNumberFormat: data.invoiceNumberFormat,
        currency: data.currency,
        language: data.language,
        theme: data.theme,
      });

      return mapShopToLegacy(updatedShop);
    } catch (e) {
      console.error('SQLite shop update service error:', e);
      throw e;
    }
  },
};
