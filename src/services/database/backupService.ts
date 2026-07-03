// src/services/database/backupService.ts
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { getDatabase } from './db';

export const backupService = {
  async exportBackup(shopId: string): Promise<void> {
    const db = getDatabase();

    // Fetch all tables
    const shops = await db.getAllAsync('SELECT * FROM shops WHERE id = ?', [shopId]);
    const users = await db.getAllAsync('SELECT * FROM users WHERE shop_id = ?', [shopId]);
    const customers = await db.getAllAsync('SELECT * FROM customers WHERE shop_id = ?', [shopId]);
    const buyers = await db.getAllAsync('SELECT * FROM buyers WHERE shop_id = ?', [shopId]);
    const products = await db.getAllAsync('SELECT * FROM products WHERE shop_id = ?', [shopId]);
    const invoices = await db.getAllAsync('SELECT * FROM invoices WHERE shop_id = ?', [shopId]);
    const invoiceItems = await db.getAllAsync(
      `SELECT ii.* FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       WHERE i.shop_id = ?`,
      [shopId]
    );
    const payments = await db.getAllAsync('SELECT * FROM payments WHERE shop_id = ?', [shopId]);
    const notifications = await db.getAllAsync('SELECT * FROM notifications WHERE shop_id = ?', [shopId]);

    const backupData = {
      version: 1,
      timestamp: new Date().toISOString(),
      shopId,
      tables: {
        shops,
        users,
        customers,
        buyers,
        products,
        invoices,
        invoice_items: invoiceItems,
        payments,
        notifications,
      },
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const fileUri = `${FileSystem.documentDirectory}BillDesk_Backup_${shopId}.json`;
    await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: FileSystem.EncodingType.UTF8 });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export BillDesk Backup',
        UTI: 'public.json',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  },

  async importBackup(shopId: string): Promise<boolean> {
    const db = getDatabase();

    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return false;
    }

    const fileUri = result.assets[0].uri;
    const jsonString = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
    const backupData = JSON.parse(jsonString);

    if (!backupData.tables || !backupData.shopId) {
      throw new Error('Invalid backup file format');
    }

    // Begin SQLite Transaction
    await db.execAsync('BEGIN TRANSACTION;');

    try {
      const { tables } = backupData;

      // 1. Shops
      if (tables.shops) {
        for (const s of tables.shops) {
          await db.runAsync(
            `INSERT OR REPLACE INTO shops (id, owner_id, shop_name, owner_name, email, phone, address, logo, business_type, gst, upi_id, bank_details, invoice_number_format, currency, language, theme, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              s.id, s.owner_id ?? null, s.shop_name ?? s.name, s.owner_name, s.email, s.phone ?? s.mobile, s.address ?? null, s.logo ?? s.logo_url ?? null,
              s.business_type, s.gst ?? null, s.upi_id ?? null, s.bank_details ?? null, s.invoice_number_format, s.currency, s.language, s.theme, s.created_at, s.updated_at
            ]
          );
        }
      }

      // 2. Customers
      if (tables.customers) {
        for (const c of tables.customers) {
          await db.runAsync(
            `INSERT OR REPLACE INTO customers (id, shop_id, name, mobile, email, address, gst_number, opening_balance, credit_limit, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [c.id, c.shop_id, c.name, c.mobile, c.email, c.address, c.gst_number ?? c.gst, c.opening_balance, c.credit_limit, c.notes, c.created_at, c.updated_at]
          );
        }
      }

      // 3. Buyers
      if (tables.buyers) {
        for (const b of tables.buyers) {
          await db.runAsync(
            `INSERT OR REPLACE INTO buyers (id, shop_id, name, mobile, email, address, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [b.id, b.shop_id, b.name, b.mobile, b.email, b.address, b.notes, b.created_at, b.updated_at]
          );
        }
      }

      // 4. Products
      if (tables.products) {
        for (const p of tables.products) {
          await db.runAsync(
            `INSERT OR REPLACE INTO products (id, shop_id, product_name, rate, gst, unit, stock, sku, barcode, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [p.id, p.shop_id, p.product_name ?? p.name, p.rate ?? p.price, p.gst ?? p.tax_rate, p.unit, p.stock ?? null, p.sku ?? null, p.barcode ?? null, p.created_at, p.updated_at]
          );
        }
      }

      // 5. Invoices
      if (tables.invoices) {
        for (const i of tables.invoices) {
          await db.runAsync(
            `INSERT OR REPLACE INTO invoices (id, shop_id, customer_id, customer_name, buyer_id, buyer_name, invoice_number, invoice_date, due_date, subtotal, gst, discount, transport, packing, other_charges, grand_total, paid_amount, advance_paid, pending_amount, status, notes, terms, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              i.id, i.shop_id, i.customer_id, i.customer_name, i.buyer_id ?? null, i.buyer_name ?? null, i.invoice_number, i.invoice_date ?? i.date, i.due_date ?? null,
              i.subtotal, i.gst ?? i.tax_amount, i.discount ?? i.discount_amount, i.transport ?? i.transport_charge, i.packing ?? i.packing_charge, i.other_charges ?? i.other_charge,
              i.grand_total ?? i.total, i.paid_amount, i.advance_paid ?? i.advance_payment, i.pending_amount ?? i.outstanding ?? 0, i.status, i.notes ?? null, i.terms ?? null, i.created_at, i.updated_at
            ]
          );
        }
      }

      // 6. Invoice Items
      if (tables.invoice_items) {
        for (const ii of tables.invoice_items) {
          await db.runAsync(
            `INSERT OR REPLACE INTO invoice_items (id, invoice_id, product_id, product_name, description, alt_quantity, alt_unit, quantity, unit, rate, gst, discount, total)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [ii.id, ii.invoice_id, ii.product_id ?? null, ii.product_name, ii.description ?? null, ii.alt_quantity ?? null, ii.alt_unit ?? null, ii.quantity, ii.unit, ii.rate ?? ii.price, ii.gst ?? ii.tax_rate, ii.discount, ii.total ?? ii.amount]
          );
        }
      }

      // 7. Payments
      if (tables.payments) {
        for (const p of tables.payments) {
          await db.runAsync(
            `INSERT OR REPLACE INTO payments (id, shop_id, invoice_id, invoice_number, customer_id, customer_name, amount, payment_mode, payment_date, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [p.id, p.shop_id, p.invoice_id ?? null, p.invoice_number ?? null, p.customer_id, p.customer_name, p.amount, p.payment_mode ?? p.method, p.payment_date ?? p.date, p.notes ?? null, p.created_at]
          );
        }
      }

      // Commit transaction
      await db.execAsync('COMMIT;');
      return true;
    } catch (err) {
      await db.execAsync('ROLLBACK;');
      throw err;
    }
  },
};
