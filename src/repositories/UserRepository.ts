// src/repositories/UserRepository.ts
import { getDatabase } from '../services/database/db';
import type { User } from '../types';

export const hashPassword = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return 'v2_' + Math.abs(hash).toString(36);
};

const mapRow = (row: Record<string, unknown>): User => ({
  id: row.id as string,
  shopId: row.shop_id as string,
  fullName: row.full_name as string,
  email: row.email as string,
  mobile: row.mobile as string | undefined,
  passwordHash: row.password_hash as string | undefined,
  role: row.role as 'owner' | 'admin' | 'staff',
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
  lastLogin: row.last_login as string | undefined,
});

export const UserRepository = {
  async getById(id: string): Promise<User | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return row ? mapRow(row) : null;
  },

  async getByEmail(email: string): Promise<User | null> {
    const db = getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM users WHERE LOWER(email) = ?',
      [email.trim().toLowerCase()]
    );
    return row ? mapRow(row) : null;
  },

  async create(
    id: string,
    shopId: string,
    data: { fullName: string; email: string; mobile?: string; passwordHash?: string; role?: 'owner' | 'admin' | 'staff' }
  ): Promise<User> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const role = data.role ?? 'owner';

    await db.runAsync(
      `INSERT INTO users (id, shop_id, full_name, email, mobile, password_hash, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, shopId, data.fullName, data.email.trim().toLowerCase(), data.mobile ?? null, data.passwordHash ?? null, role, now, now]
    );

    return (await this.getById(id))!;
  },

  async updateLastLogin(id: string): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?',
      [now, now, id]
    );
  },

  async updatePassword(id: string, newPasswordHash: string): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
      [newPasswordHash, now, id]
    );
  }
};
