// src/services/syncService.ts
import { Platform } from 'react-native';
import { getDatabase, generateId } from './database/db';
import type { SyncQueueItem } from '../types';
import { storage } from '../storage';
const LAST_SYNCED_KEY = 'billdesk_last_synced_at';
const BACKEND_URL_KEY = 'billdesk_backend_url';

export const syncService = {
  getLastSyncedAt(): string | null {
    return storage.getString(LAST_SYNCED_KEY) ?? null;
  },

  setLastSyncedAt(timestamp: string): void {
    storage.set(LAST_SYNCED_KEY, timestamp);
  },

  getBackendUrl(): string {
    const defaultUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api';
    return storage.getString(BACKEND_URL_KEY) ?? defaultUrl;
  },

  setBackendUrl(url: string): void {
    storage.set(BACKEND_URL_KEY, url);
  },

  async queueOperation(
    entityType: SyncQueueItem['entityType'],
    entityId: string,
    operation: SyncQueueItem['operation'],
    payload: any
  ): Promise<void> {
    const db = getDatabase();
    const id = generateId();
    const now = new Date().toISOString();
    const payloadStr = JSON.stringify(payload);

    await db.runAsync(
      `INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, status, attempts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
      [id, entityType, entityId, operation, payloadStr, now, now]
    );
  },

  async getPendingCount(): Promise<number> {
    const db = getDatabase();
    const row = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending' OR status = 'failed'"
    );
    return row?.count ?? 0;
  },

  async getQueue(): Promise<SyncQueueItem[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      "SELECT * FROM sync_queue ORDER BY created_at ASC"
    );
    return rows.map(row => ({
      id: row.id as string,
      entityType: row.entity_type as SyncQueueItem['entityType'],
      entityId: row.entity_id as string,
      operation: row.operation as SyncQueueItem['operation'],
      payload: row.payload as string,
      status: row.status as SyncQueueItem['status'],
      attempts: row.attempts as number,
      lastError: row.last_error as string | undefined,
      createdAt: row.created_at as string,
    }));
  },

  async runSync(shopId: string): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
    const db = getDatabase();
    const pendingItems = await this.getQueue();
    const errors: string[] = [];
    let syncedCount = 0;

    if (pendingItems.length === 0) {
      return { success: true, syncedCount: 0, errors: [] };
    }

    const backendUrl = this.getBackendUrl();

    for (const item of pendingItems) {
      if (item.status === 'synced') continue;

      // Update status to syncing
      await db.runAsync("UPDATE sync_queue SET status = 'syncing', updated_at = ? WHERE id = ?", [
        new Date().toISOString(),
        item.id,
      ]);

      try {
        const payload = JSON.parse(item.payload);
        let endpoint = '';
        if (item.entityType === 'customer') endpoint = `${backendUrl}/customers`;
        if (item.entityType === 'buyer') endpoint = `${backendUrl}/buyers`;
        if (item.entityType === 'invoice') endpoint = `${backendUrl}/invoices`;
        if (item.entityType === 'payment') endpoint = `${backendUrl}/payments`;
        if (item.entityType === 'product') endpoint = `${backendUrl}/products`;

        let response;
        if (item.operation === 'create') {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Shop-Id': shopId },
            body: JSON.stringify(payload),
          });
        } else if (item.operation === 'update') {
          response = await fetch(`${endpoint}/${item.entityId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Shop-Id': shopId },
            body: JSON.stringify(payload),
          });
        } else if (item.operation === 'delete') {
          response = await fetch(`${endpoint}/${item.entityId}`, {
            method: 'DELETE',
            headers: { 'X-Shop-Id': shopId },
          });
        }

        if (response && !response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.message || `HTTP error ${response.status}`);
        }

        // Successfully synced — delete queue item
        await db.runAsync("DELETE FROM sync_queue WHERE id = ?", [item.id]);
        syncedCount++;
      } catch (err) {
        const errorMsg = (err as Error).message || 'Unknown network error';
        errors.push(`Failed to sync ${item.entityType} (${item.entityId}): ${errorMsg}`);

        // Update status to failed and increment attempts
        await db.runAsync(
          "UPDATE sync_queue SET status = 'failed', attempts = attempts + 1, last_error = ?, updated_at = ? WHERE id = ?",
          [errorMsg, new Date().toISOString(), item.id]
        );
      }
    }

    const success = errors.length === 0;
    if (success) {
      this.setLastSyncedAt(new Date().toISOString());
    }

    return { success, syncedCount, errors };
  },
};
