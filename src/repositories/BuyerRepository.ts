// src/repositories/BuyerRepository.ts
import { getDatabase } from '../services/database/db';
import type { Buyer, PaginatedResult } from '../types';

const mapRow = (row: Record<string, unknown>): Buyer => ({
  id: row.id as string,
  shopId: row.shop_id as string,
  name: row.name as string,
  mobile: row.mobile as string | undefined,
  email: row.email as string | undefined,
  address: row.address as string | undefined,
  gst: row.gst as string | undefined,
  openingBalance: (row.opening_balance as number) || 0,
  creditLimit: (row.credit_limit as number) || 0,
  notes: row.notes as string | undefined,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
  totalBilled: (row.total_billed as number) || 0,
  totalPaid: (row.total_paid as number) || 0,
  outstanding: (row.outstanding as number) || 0,
});

export const BuyerRepository = {
  async getById(shopId: string, id: string): Promise<Buyer | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT b.*,
        COALESCE((SELECT SUM(i.grand_total) FROM invoices i WHERE i.buyer_id = b.id AND i.shop_id = b.shop_id), 0) as total_billed,
        COALESCE((SELECT SUM(i.paid_amount) FROM invoices i WHERE i.buyer_id = b.id AND i.shop_id = b.shop_id), 0) as total_paid,
        COALESCE((SELECT SUM(i.pending_amount) FROM invoices i WHERE i.buyer_id = b.id AND i.shop_id = b.shop_id), 0) + b.opening_balance as outstanding
      FROM buyers b WHERE b.shop_id = ? AND b.id = ?`,
      [shopId, id]
    );
    return row ? mapRow(row) : null;
  },

  async getAll(
    shopId: string,
    opts?: { search?: string; page?: number; pageSize?: number; sortBy?: 'name' | 'outstanding' | 'recent' }
  ): Promise<PaginatedResult<Buyer>> {
    const db = getDatabase();
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const search = opts?.search ? `%${opts.search}%` : null;

    const whereClauses = ['b.shop_id = ?'];
    const params: (string | number)[] = [shopId];

    if (search) {
      whereClauses.push('(b.name LIKE ? OR b.mobile LIKE ? OR b.email LIKE ?)');
      params.push(search, search, search);
    }

    const where = whereClauses.join(' AND ');

    let orderBy = 'b.name ASC';
    if (opts?.sortBy === 'outstanding') {
      orderBy = 'outstanding DESC';
    } else if (opts?.sortBy === 'recent') {
      orderBy = 'b.created_at DESC';
    }

    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT b.*,
        COALESCE((SELECT SUM(i.grand_total) FROM invoices i WHERE i.buyer_id = b.id AND i.shop_id = b.shop_id), 0) as total_billed,
        COALESCE((SELECT SUM(i.paid_amount) FROM invoices i WHERE i.buyer_id = b.id AND i.shop_id = b.shop_id), 0) as total_paid,
        COALESCE((SELECT SUM(i.pending_amount) FROM invoices i WHERE i.buyer_id = b.id AND i.shop_id = b.shop_id), 0) + b.opening_balance as outstanding
      FROM buyers b
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const countRow = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM buyers b WHERE ${where}`,
      params
    );
    const total = countRow?.count ?? 0;

    return {
      data: rows.map(mapRow),
      total,
      page,
      pageSize,
      hasMore: offset + rows.length < total,
    };
  },

  async checkDuplicate(shopId: string, name: string, mobile?: string): Promise<Buyer | null> {
    const db = getDatabase();
    let query = 'SELECT id FROM buyers WHERE shop_id = ? AND (LOWER(name) = ?';
    const params: string[] = [shopId, name.trim().toLowerCase()];
    if (mobile && mobile.trim().length > 0) {
      query += ' OR mobile = ?';
      params.push(mobile.trim());
    }
    query += ') LIMIT 1';
    const row = await db.getFirstAsync<{ id: string }>(query, params);
    return row ? this.getById(shopId, row.id) : null;
  },

  async create(
    shopId: string,
    id: string,
    data: Omit<Buyer, 'id' | 'shopId' | 'createdAt' | 'updatedAt'>
  ): Promise<Buyer> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const actualShopId = shopId || 'default-shop';

    // Ensure shop exists to satisfy foreign key constraint
    const shopExists = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM shops WHERE id = ?',
      [actualShopId]
    );
    if (!shopExists) {
      await db.runAsync(
        `INSERT INTO shops (id, shop_name, owner_name, email, phone, business_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [actualShopId, 'My Shop', 'Owner', 'shop@example.com', '0000000000', 'Retailer', now, now]
      );
    }

    const mobileVal = data.mobile && data.mobile.trim() !== '' ? data.mobile.trim() : null;
    const emailVal = data.email && data.email.trim() !== '' ? data.email.trim() : null;
    const addressVal = data.address && data.address.trim() !== '' ? data.address.trim() : null;
    const gstVal = data.gst && data.gst.trim() !== '' ? data.gst.trim() : null;
    const notesVal = data.notes && data.notes.trim() !== '' ? data.notes.trim() : null;
    const openingBalanceVal = data.openingBalance ?? 0;
    const creditLimitVal = data.creditLimit ?? 0;

    await db.runAsync(
      `INSERT INTO buyers (id, shop_id, name, mobile, email, address, gst, opening_balance, credit_limit, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, actualShopId, data.name, mobileVal, emailVal,
        addressVal, gstVal, openingBalanceVal, creditLimitVal, notesVal, now, now
      ]
    );

    return (await this.getById(actualShopId, id))!;
  },

  async update(
    shopId: string,
    id: string,
    data: Partial<Omit<Buyer, 'id' | 'shopId' | 'createdAt'>>
  ): Promise<Buyer> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const mobileVal = data.mobile !== undefined ? (data.mobile && data.mobile.trim() !== '' ? data.mobile.trim() : null) : undefined;
    const emailVal = data.email !== undefined ? (data.email && data.email.trim() !== '' ? data.email.trim() : null) : undefined;
    const addressVal = data.address !== undefined ? (data.address && data.address.trim() !== '' ? data.address.trim() : null) : undefined;
    const gstVal = data.gst !== undefined ? (data.gst && data.gst.trim() !== '' ? data.gst.trim() : null) : undefined;
    const notesVal = data.notes !== undefined ? (data.notes && data.notes.trim() !== '' ? data.notes.trim() : null) : undefined;
    const openingBalanceVal = data.openingBalance !== undefined ? data.openingBalance : undefined;
    const creditLimitVal = data.creditLimit !== undefined ? data.creditLimit : undefined;

    await db.runAsync(
      `UPDATE buyers SET
        name = COALESCE(?, name),
        mobile = CASE WHEN ? = 1 THEN ? ELSE mobile END,
        email = CASE WHEN ? = 1 THEN ? ELSE email END,
        address = CASE WHEN ? = 1 THEN ? ELSE address END,
        gst = CASE WHEN ? = 1 THEN ? ELSE gst END,
        opening_balance = CASE WHEN ? = 1 THEN ? ELSE opening_balance END,
        credit_limit = CASE WHEN ? = 1 THEN ? ELSE credit_limit END,
        notes = CASE WHEN ? = 1 THEN ? ELSE notes END,
        updated_at = ?
      WHERE shop_id = ? AND id = ?`,
      [
        data.name ?? null,
        mobileVal !== undefined ? 1 : 0, mobileVal ?? null,
        emailVal !== undefined ? 1 : 0, emailVal ?? null,
        addressVal !== undefined ? 1 : 0, addressVal ?? null,
        gstVal !== undefined ? 1 : 0, gstVal ?? null,
        openingBalanceVal !== undefined ? 1 : 0, openingBalanceVal ?? 0,
        creditLimitVal !== undefined ? 1 : 0, creditLimitVal ?? 0,
        notesVal !== undefined ? 1 : 0, notesVal ?? null,
        now,
        shopId,
        id
      ]
    );

    return (await this.getById(shopId, id))!;
  },

  async delete(shopId: string, id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync(
      'DELETE FROM buyers WHERE shop_id = ? AND id = ?',
      [shopId, id]
    );
  }
};
