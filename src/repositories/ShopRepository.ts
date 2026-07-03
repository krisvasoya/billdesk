// src/repositories/ShopRepository.ts
import { getDatabase } from '../services/database/db';
import type { Shop } from '../types';

const mapRow = (row: Record<string, unknown>): Shop => ({
  id: row.id as string,
  ownerId: row.owner_id as string | undefined,
  shopName: row.shop_name as string,
  ownerName: row.owner_name as string,
  businessType: row.business_type as string,
  address: row.address as string | undefined,
  logo: row.logo as string | undefined,
  phone: row.phone as string,
  email: row.email as string,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
  gst: row.gst as string | undefined,
  upiId: row.upi_id as string | undefined,
  bankDetails: row.bank_details as string | undefined,
  invoiceNumberFormat: row.invoice_number_format as string,
  currency: row.currency as string,
  language: row.language as string,
  theme: row.theme as string,
});

export const ShopRepository = {
  async getById(id: string): Promise<Shop | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM shops WHERE id = ?',
      [id]
    );
    return row ? mapRow(row) : null;
  },

  async create(
    id: string,
    data: {
      ownerId?: string;
      shopName: string;
      ownerName: string;
      email: string;
      phone: string;
      businessType: string;
      address?: string;
      logo?: string;
      gst?: string;
    }
  ): Promise<Shop> {
    const db = getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO shops (id, owner_id, shop_name, owner_name, email, phone, business_type, address, logo, gst, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.ownerId ?? null, data.shopName, data.ownerName,
        data.email.trim().toLowerCase(), data.phone, data.businessType,
        data.address ?? null, data.logo ?? null, data.gst ?? null, now, now
      ]
    );

    return (await this.getById(id))!;
  },

  async update(id: string, data: Partial<Omit<Shop, 'id' | 'createdAt'>>): Promise<Shop> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const current = await this.getById(id);
    if (!current) throw new Error('Shop not found');

    await db.runAsync(
      `UPDATE shops SET
        owner_id = COALESCE(?, owner_id),
        shop_name = COALESCE(?, shop_name),
        owner_name = COALESCE(?, owner_name),
        business_type = COALESCE(?, business_type),
        address = COALESCE(?, address),
        logo = COALESCE(?, logo),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        gst = COALESCE(?, gst),
        upi_id = COALESCE(?, upi_id),
        bank_details = COALESCE(?, bank_details),
        invoice_number_format = COALESCE(?, invoice_number_format),
        currency = COALESCE(?, currency),
        language = COALESCE(?, language),
        theme = COALESCE(?, theme),
        updated_at = ?
      WHERE id = ?`,
      [
        data.ownerId ?? null,
        data.shopName ?? null,
        data.ownerName ?? null,
        data.businessType ?? null,
        data.address ?? null,
        data.logo ?? null,
        data.phone ?? null,
        data.email ?? null,
        data.gst ?? null,
        data.upiId ?? null,
        data.bankDetails ?? null,
        data.invoiceNumberFormat ?? null,
        data.currency ?? null,
        data.language ?? null,
        data.theme ?? null,
        now,
        id
      ]
    );

    return (await this.getById(id))!;
  }
};
