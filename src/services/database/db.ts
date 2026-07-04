// src/services/database/db.ts
import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, DATABASE_NAME, DATABASE_VERSION, MIGRATIONS } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
};

const tableExists = async (database: SQLite.SQLiteDatabase, table: string): Promise<boolean> => {
  try {
    const row = await database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?",
      [table]
    );
    return (row?.count ?? 0) > 0;
  } catch (err) {
    console.error(`[BillDesk] tableExists(${table}) check failed:`, err);
    return false;
  }
};

const columnExists = async (database: SQLite.SQLiteDatabase, table: string, column: string): Promise<boolean> => {
  try {
    const cols = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${table});`);
    return cols.some(c => c.name === column);
  } catch (err) {
    // Return false instead of throwing if the table doesn't exist yet
    return false;
  }
};

const runStatements = async (database: SQLite.SQLiteDatabase, sql: string) => {
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  for (const statement of statements) {
    try {
      // Parse ALTER TABLE statements to check if they should be executed
      // 1. ADD COLUMN: ALTER TABLE table_name ADD COLUMN column_name ...
      const addColMatch = statement.match(/ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)/i);
      if (addColMatch) {
        const [, table, column] = addColMatch;
        const exists = await columnExists(database, table, column);
        if (exists) {
          console.log(`[BillDesk] Skipping ADD COLUMN: column ${table}.${column} already exists.`);
          continue;
        }
      }

      // 2. RENAME COLUMN: ALTER TABLE table_name RENAME COLUMN old_col TO new_col
      const renameColMatch = statement.match(/ALTER\s+TABLE\s+(\w+)\s+RENAME\s+COLUMN\s+(\w+)\s+TO\s+(\w+)/i);
      if (renameColMatch) {
        const [, table, oldCol, newCol] = renameColMatch;
        const oldExists = await columnExists(database, table, oldCol);
        const newExists = await columnExists(database, table, newCol);
        
        if (!oldExists && newExists) {
          console.log(`[BillDesk] Skipping RENAME COLUMN: ${table}.${oldCol} is already renamed to ${newCol}.`);
          continue;
        }
        if (!oldExists && !newExists) {
          console.warn(`[BillDesk] Migration warning: neither ${table}.${oldCol} nor ${table}.${newCol} exists.`);
          continue;
        }
      }

      await database.execAsync(statement + ';');
    } catch (err) {
      const msg = (err as Error).message || '';
      console.error(`[BillDesk] Migration statement failed: "${statement}". Error details:`, err);
      // Ignore errors from migrations already applied or columns/tables already renamed
      if (
        msg.includes('duplicate column') || 
        msg.includes('already exists') ||
        msg.includes('no such column') ||
        msg.includes('no such table') ||
        msg.toLowerCase().includes('duplicate') ||
        msg.toLowerCase().includes('exist') ||
        msg.toLowerCase().includes('no such')
      ) {
        console.warn(`[BillDesk] Ignoring database statement migration warning: ${msg}`);
        continue;
      }
      throw err;
    }
  }
};

const ensureColumnExists = async (database: SQLite.SQLiteDatabase, table: string, column: string, definition: string) => {
  try {
    const cols = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${table});`);
    const exists = cols.some(c => c.name === column);
    if (!exists) {
      await database.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
      console.log(`[BillDesk] Added column ${column} to ${table}`);
    }
  } catch (err) {
    // Ignore – column already exists or table doesn't exist yet
    console.warn(`[BillDesk] ensureColumnExists(${table}.${column}):`, (err as Error).message);
  }
};

export const initDatabase = async (): Promise<void> => {
  db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = OFF;'); // OFF during migrations

  // Get current user_version
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion === 0) {
    // Fresh install — run full schema in transaction
    await db.execAsync('BEGIN TRANSACTION;');
    try {
      await runStatements(db, CREATE_TABLES_SQL);
      await db.execAsync('COMMIT;');
    } catch (freshErr) {
      await db.execAsync('ROLLBACK;');
      console.error('[BillDesk] Fresh database creation failed, rolled back:', freshErr);
      throw freshErr;
    }
  } else if (currentVersion < DATABASE_VERSION) {
    // Existing install — run migrations from current to target in transaction
    await db.execAsync('BEGIN TRANSACTION;');
    try {
      for (let v = currentVersion + 1; v <= DATABASE_VERSION; v++) {
        const migration = MIGRATIONS[v];
        if (migration) {
          console.log(`[BillDesk] Running migration ${v} on database...`);
          await runStatements(db, migration);
        }
      }
      await db.execAsync('COMMIT;');
    } catch (migErr) {
      await db.execAsync('ROLLBACK;');
      console.error(`[BillDesk] Migration from version ${currentVersion} failed! Rollback triggered.`, migErr);
      throw migErr;
    }
  }

  // Set version
  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);

  // Enforce schema sanity by verifying all upgraded schema columns are present
  await ensureColumnExists(db, 'shops', 'owner_id', 'TEXT');
  await ensureColumnExists(db, 'shops', 'shop_name', 'TEXT NOT NULL DEFAULT "My Shop"');
  await ensureColumnExists(db, 'shops', 'phone', 'TEXT NOT NULL DEFAULT "0000000000"');
  await ensureColumnExists(db, 'shops', 'logo', 'TEXT');

  await ensureColumnExists(db, 'users', 'password_hash', 'TEXT');
  await ensureColumnExists(db, 'users', 'mobile', 'TEXT');
  await ensureColumnExists(db, 'users', 'updated_at', 'TEXT');
  await ensureColumnExists(db, 'users', 'last_login', 'TEXT');
  await ensureColumnExists(db, 'users', 'full_name', 'TEXT NOT NULL DEFAULT ""');

  await ensureColumnExists(db, 'customers', 'gst_number', 'TEXT');

  await ensureColumnExists(db, 'products', 'product_name', 'TEXT NOT NULL DEFAULT ""');
  await ensureColumnExists(db, 'products', 'rate', 'REAL NOT NULL DEFAULT 0');
  await ensureColumnExists(db, 'products', 'gst', 'REAL NOT NULL DEFAULT 0');
  await ensureColumnExists(db, 'products', 'sku', 'TEXT');
  await ensureColumnExists(db, 'products', 'barcode', 'TEXT');

  await ensureColumnExists(db, 'invoices', 'invoice_date', 'TEXT NOT NULL DEFAULT ""');
  await ensureColumnExists(db, 'invoices', 'gst', 'REAL NOT NULL DEFAULT 0');
  await ensureColumnExists(db, 'invoices', 'discount', 'REAL NOT NULL DEFAULT 0');
  await ensureColumnExists(db, 'invoices', 'transport', 'REAL NOT NULL DEFAULT 0');
  await ensureColumnExists(db, 'invoices', 'packing', 'REAL NOT NULL DEFAULT 0');
  await ensureColumnExists(db, 'invoices', 'other_charges', 'REAL NOT NULL DEFAULT 0');
  await ensureColumnExists(db, 'invoices', 'grand_total', 'REAL NOT NULL DEFAULT 0');
  await ensureColumnExists(db, 'invoices', 'advance_paid', 'REAL NOT NULL DEFAULT 0');
  await ensureColumnExists(db, 'invoices', 'pending_amount', 'REAL NOT NULL DEFAULT 0');
  await ensureColumnExists(db, 'invoices', 'deleted_at', 'TEXT');

  await ensureColumnExists(db, 'invoice_items', 'product_id', 'TEXT');
  await ensureColumnExists(db, 'invoice_items', 'rate', 'REAL NOT NULL DEFAULT 0');
  await ensureColumnExists(db, 'invoice_items', 'gst', 'REAL NOT NULL DEFAULT 0');
  await ensureColumnExists(db, 'invoice_items', 'total', 'REAL NOT NULL DEFAULT 0');

  await ensureColumnExists(db, 'payments', 'payment_mode', 'TEXT NOT NULL DEFAULT "cash"');
  await ensureColumnExists(db, 'payments', 'payment_date', 'TEXT NOT NULL DEFAULT ""');
  await ensureColumnExists(db, 'payments', 'deleted_at', 'TEXT');

  await ensureColumnExists(db, 'buyers', 'gst', 'TEXT');
  await ensureColumnExists(db, 'buyers', 'opening_balance', 'REAL NOT NULL DEFAULT 0');
  await ensureColumnExists(db, 'buyers', 'credit_limit', 'REAL NOT NULL DEFAULT 0');
  await ensureColumnExists(db, 'buyers', 'deleted_at', 'TEXT');

  // Run database financial field corrections to fix double-counting issues
  try {
    // 1. Correct paid_amount to only represent subsequent payments recorded in payments table
    await db.runAsync(`
      UPDATE invoices
      SET paid_amount = COALESCE(
        (SELECT SUM(amount) FROM payments WHERE payments.invoice_id = invoices.id AND deleted_at IS NULL),
        0
      )
    `);

    // 2. Recalculate pending_amount safely using grand_total, advance_paid, and corrected paid_amount
    await db.runAsync(`
      UPDATE invoices
      SET pending_amount = CASE 
        WHEN (grand_total - advance_paid - paid_amount) < 0 THEN 0 
        ELSE (grand_total - advance_paid - paid_amount) 
      END
    `);

    // 3. Align status fields
    await db.runAsync(`
      UPDATE invoices
      SET status = CASE 
        WHEN pending_amount = 0 THEN 'paid'
        WHEN (paid_amount + advance_paid) > 0 THEN 'partial'
        ELSE 'pending'
      END
    `);
  } catch (err) {
    console.error('[BillDesk] Financial data correction failed:', err);
  }

  // Seed demo user if not exists (only in development builds)
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    try {
      const demoShopId = 'demo-shop-id';
      const demoUserId = 'demo-user-id';
      const now = new Date().toISOString();

      // Ensure demo shop exists
      await db.runAsync(
        `INSERT OR REPLACE INTO shops (id, shop_name, owner_name, email, phone, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [demoShopId, 'Demo Business Shop', 'Demo Owner', 'demo@billdesk.com', '9999988888', now, now]
      );

      // Hash password: 'password123'
      const password = 'password123';
      let hash = 0;
      for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      const demoPasswordHash = 'v2_' + Math.abs(hash).toString(36);

      // Ensure demo user exists with exact password
      await db.runAsync(
        `INSERT OR REPLACE INTO users (id, shop_id, full_name, email, mobile, password_hash, role, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [demoUserId, demoShopId, 'Demo User', 'demo@billdesk.com', '9999988888', demoPasswordHash, 'owner', now, now]
      );
      console.log('[BillDesk] Successfully seeded/updated demo user demo@billdesk.com / password123');
    } catch (seedErr) {
      console.error('[BillDesk] Error seeding demo user:', seedErr);
    }
  }

  // Re-enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.closeAsync();
    db = null;
  }
};
