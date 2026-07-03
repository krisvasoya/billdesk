// src/services/database/notificationService.ts
import { getDatabase, generateId } from './db';
import type { AppNotification, NotificationType } from '../../types';

const mapRow = (row: Record<string, unknown>): AppNotification => ({
  id: row.id as string,
  shopId: row.shop_id as string,
  type: row.type as NotificationType,
  title: row.title as string,
  body: row.body as string,
  data: row.data as string | undefined,
  isRead: row.is_read === 1,
  createdAt: row.created_at as string,
});

export const notificationService = {
  async getAll(shopId: string): Promise<AppNotification[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM notifications WHERE shop_id = ? ORDER BY created_at DESC LIMIT 100',
      [shopId]
    );
    return rows.map(mapRow);
  },

  async getUnreadCount(shopId: string): Promise<number> {
    const db = getDatabase();
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM notifications WHERE shop_id = ? AND is_read = 0',
      [shopId]
    );
    return row?.count ?? 0;
  },

  async create(
    shopId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<AppNotification> {
    const db = getDatabase();
    const id = generateId();
    const now = new Date().toISOString();
    const dataStr = data ? JSON.stringify(data) : null;

    await db.runAsync(
      'INSERT INTO notifications (id, shop_id, type, title, body, data, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)',
      [id, shopId, type, title, body, dataStr, now]
    );

    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM notifications WHERE id = ?',
      [id]
    );
    return mapRow(row!);
  },

  async markAsRead(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
  },

  async markAllAsRead(shopId: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('UPDATE notifications SET is_read = 1 WHERE shop_id = ?', [shopId]);
  },

  async delete(id: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM notifications WHERE id = ?', [id]);
  },

  async clearAll(shopId: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync('DELETE FROM notifications WHERE shop_id = ?', [shopId]);
  },
};
