// src/repositories/ProductRepository.ts
import { getDatabase } from '../services/database/db';
import type { Product, PaginatedResult } from '../types';

const mapRow = (row: Record<string, unknown>): Product => ({
  id: row.id as string,
  shopId: row.shop_id as string,
  productName: row.product_name as string,
  rate: (row.rate as number) || 0,
  gst: (row.gst as number) || 0,
  unit: row.unit as string,
  stock: row.stock !== null ? (row.stock as number) : undefined,
  sku: row.sku as string | undefined,
  barcode: row.barcode as string | undefined,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
  deletedAt: row.deleted_at as string | undefined,
});

export const ProductRepository = {
  async getById(shopId: string, id: string): Promise<Product | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM products WHERE shop_id = ? AND id = ? AND deleted_at IS NULL',
      [shopId, id]
    );
    return row ? mapRow(row) : null;
  },

  async getAll(
    shopId: string,
    opts?: { search?: string; page?: number; pageSize?: number }
  ): Promise<PaginatedResult<Product>> {
    const db = getDatabase();
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const search = opts?.search ? `%${opts.search.trim().toLowerCase()}%` : null;

    const whereClauses = ['shop_id = ?', 'deleted_at IS NULL'];
    const params: (string | number)[] = [shopId];

    if (search) {
      whereClauses.push('(LOWER(product_name) LIKE ? OR LOWER(sku) LIKE ? OR LOWER(barcode) LIKE ?)');
      params.push(search, search, search);
    }

    const where = whereClauses.join(' AND ');

    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM products
      WHERE ${where}
      ORDER BY product_name ASC
      LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const countRow = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM products WHERE ${where}`,
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

  async checkDuplicate(shopId: string, productName: string, sku?: string, barcode?: string): Promise<Product | null> {
    const db = getDatabase();
    let query = 'SELECT id FROM products WHERE shop_id = ? AND deleted_at IS NULL AND (LOWER(product_name) = ?';
    const params: string[] = [shopId, productName.trim().toLowerCase()];

    if (sku && sku.trim().length > 0) {
      query += ' OR LOWER(sku) = ?';
      params.push(sku.trim().toLowerCase());
    }

    if (barcode && barcode.trim().length > 0) {
      query += ' OR LOWER(barcode) = ?';
      params.push(barcode.trim().toLowerCase());
    }

    query += ') LIMIT 1';
    const row = await db.getFirstAsync<{ id: string }>(query, params);
    return row ? this.getById(shopId, row.id) : null;
  },

  async create(
    shopId: string,
    id: string,
    data: Omit<Product, 'id' | 'shopId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
  ): Promise<Product> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const skuVal = (data.sku && data.sku.trim() !== '') ? data.sku.trim() : null;
    const barcodeVal = (data.barcode && data.barcode.trim() !== '') ? data.barcode.trim() : null;
    const stockVal = data.stock !== undefined && data.stock !== null ? data.stock : null;

    await db.runAsync(
      `INSERT INTO products (id, shop_id, product_name, rate, gst, unit, stock, sku, barcode, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, shopId, data.productName, data.rate, data.gst,
        data.unit, stockVal, skuVal, barcodeVal, now, now
      ]
    );

    return (await this.getById(shopId, id))!;
  },

  async update(
    shopId: string,
    id: string,
    data: Partial<Omit<Product, 'id' | 'shopId' | 'createdAt' | 'deletedAt'>>
  ): Promise<Product> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const skuVal = data.sku !== undefined ? (data.sku && data.sku.trim() !== '' ? data.sku.trim() : null) : undefined;
    const barcodeVal = data.barcode !== undefined ? (data.barcode && data.barcode.trim() !== '' ? data.barcode.trim() : null) : undefined;
    const stockVal = data.stock !== undefined ? data.stock : undefined;

    await db.runAsync(
      `UPDATE products SET
        product_name = COALESCE(?, product_name),
        rate = COALESCE(?, rate),
        gst = COALESCE(?, gst),
        unit = COALESCE(?, unit),
        stock = CASE WHEN ? = 1 THEN ? ELSE stock END,
        sku = CASE WHEN ? = 1 THEN ? ELSE sku END,
        barcode = CASE WHEN ? = 1 THEN ? ELSE barcode END,
        updated_at = ?
      WHERE shop_id = ? AND id = ? AND deleted_at IS NULL`,
      [
        data.productName ?? null,
        data.rate ?? null,
        data.gst ?? null,
        data.unit ?? null,
        stockVal !== undefined ? 1 : 0, stockVal ?? null,
        skuVal !== undefined ? 1 : 0, skuVal ?? null,
        barcodeVal !== undefined ? 1 : 0, barcodeVal ?? null,
        now,
        shopId,
        id
      ]
    );

    return (await this.getById(shopId, id))!;
  },

  async delete(shopId: string, id: string): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE products SET deleted_at = ?, updated_at = ? WHERE shop_id = ? AND id = ?',
      [now, now, shopId, id]
    );
  },

  async getRecentProducts(shopId: string, limit: number = 5): Promise<Product[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT DISTINCT p.* FROM products p
       JOIN invoice_items ii ON ii.product_id = p.id
       JOIN invoices i ON i.id = ii.invoice_id
       WHERE p.shop_id = ? AND p.deleted_at IS NULL AND i.deleted_at IS NULL
       ORDER BY i.invoice_date DESC
       LIMIT ?`,
      [shopId, limit]
    );
    return rows.map(mapRow);
  },

  async getFrequentProducts(shopId: string, limit: number = 5): Promise<Product[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT p.*, COUNT(ii.id) as freq FROM products p
       JOIN invoice_items ii ON ii.product_id = p.id
       WHERE p.shop_id = ? AND p.deleted_at IS NULL
       GROUP BY p.id
       ORDER BY freq DESC
       LIMIT ?`,
      [shopId, limit]
    );
    return rows.map(mapRow);
  }
};
