// src/services/database/schema.ts
export const DATABASE_NAME = 'billdesk.db';
export const DATABASE_VERSION = 6;

export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS shops (
    id TEXT PRIMARY KEY NOT NULL,
    owner_id TEXT,
    shop_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    address TEXT,
    logo TEXT,
    business_type TEXT NOT NULL DEFAULT 'Retailer',
    gst TEXT,
    upi_id TEXT,
    bank_details TEXT,
    invoice_number_format TEXT NOT NULL DEFAULT 'INV-{NUMBER}',
    currency TEXT NOT NULL DEFAULT 'INR',
    language TEXT NOT NULL DEFAULT 'en',
    theme TEXT NOT NULL DEFAULT 'light',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    shop_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    mobile TEXT,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'owner',
    last_login TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY NOT NULL,
    shop_id TEXT NOT NULL,
    name TEXT NOT NULL,
    mobile TEXT,
    email TEXT,
    address TEXT,
    gst_number TEXT,
    opening_balance REAL NOT NULL DEFAULT 0,
    credit_limit REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS buyers (
    id TEXT PRIMARY KEY NOT NULL,
    shop_id TEXT NOT NULL,
    name TEXT NOT NULL,
    mobile TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY NOT NULL,
    shop_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    rate REAL NOT NULL DEFAULT 0,
    gst REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'pcs',
    stock REAL,
    sku TEXT,
    barcode TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY NOT NULL,
    shop_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    buyer_id TEXT,
    buyer_name TEXT,
    invoice_number TEXT NOT NULL,
    invoice_date TEXT NOT NULL,
    due_date TEXT,
    subtotal REAL NOT NULL DEFAULT 0,
    gst REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    transport REAL NOT NULL DEFAULT 0,
    packing REAL NOT NULL DEFAULT 0,
    other_charges REAL NOT NULL DEFAULT 0,
    grand_total REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    advance_paid REAL NOT NULL DEFAULT 0,
    pending_amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    terms TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    UNIQUE(shop_id, invoice_number)
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY NOT NULL,
    invoice_id TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT NOT NULL,
    description TEXT,
    alt_quantity REAL,
    alt_unit TEXT,
    quantity REAL NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'pcs',
    rate REAL NOT NULL DEFAULT 0,
    gst REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY NOT NULL,
    shop_id TEXT NOT NULL,
    invoice_id TEXT,
    invoice_number TEXT,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    payment_mode TEXT NOT NULL DEFAULT 'cash',
    payment_date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY NOT NULL,
    shop_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_customers_shop ON customers(shop_id);
  CREATE INDEX IF NOT EXISTS idx_buyers_shop ON buyers(shop_id);
  CREATE INDEX IF NOT EXISTS idx_invoices_shop ON invoices(shop_id);
  CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
  CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
  CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
  CREATE INDEX IF NOT EXISTS idx_payments_shop ON payments(shop_id);
  CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
  CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_shop ON notifications(shop_id);
  CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
`;

// Migration SQL for each version (run sequentially)
export const MIGRATIONS: Record<number, string> = {
  2: `
    ALTER TABLE shops ADD COLUMN upi_id TEXT;
    ALTER TABLE shops ADD COLUMN bank_details TEXT;
    ALTER TABLE shops ADD COLUMN invoice_number_format TEXT NOT NULL DEFAULT 'INV-{NUMBER}';
    ALTER TABLE shops ADD COLUMN currency TEXT NOT NULL DEFAULT 'INR';
    ALTER TABLE shops ADD COLUMN language TEXT NOT NULL DEFAULT 'en';
    ALTER TABLE shops ADD COLUMN theme TEXT NOT NULL DEFAULT 'light';
    ALTER TABLE customers ADD COLUMN credit_limit REAL NOT NULL DEFAULT 0;
    ALTER TABLE customers ADD COLUMN notes TEXT;
    ALTER TABLE invoices ADD COLUMN buyer_id TEXT;
    ALTER TABLE invoices ADD COLUMN buyer_name TEXT;
    ALTER TABLE invoices ADD COLUMN transport_charge REAL NOT NULL DEFAULT 0;
    ALTER TABLE invoices ADD COLUMN packing_charge REAL NOT NULL DEFAULT 0;
    ALTER TABLE invoices ADD COLUMN other_charge REAL NOT NULL DEFAULT 0;
    ALTER TABLE invoices ADD COLUMN advance_payment REAL NOT NULL DEFAULT 0;
    ALTER TABLE invoices ADD COLUMN terms TEXT;
    ALTER TABLE invoice_items ADD COLUMN description TEXT;
    ALTER TABLE invoice_items ADD COLUMN alt_quantity REAL;
    ALTER TABLE invoice_items ADD COLUMN alt_unit TEXT;
    CREATE TABLE IF NOT EXISTS buyers (
      id TEXT PRIMARY KEY NOT NULL,
      shop_id TEXT NOT NULL,
      name TEXT NOT NULL,
      mobile TEXT,
      email TEXT,
      address TEXT,
      gst TEXT,
      opening_balance REAL NOT NULL DEFAULT 0,
      credit_limit REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY NOT NULL,
      shop_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      data TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `,
  3: `
    CREATE INDEX IF NOT EXISTS idx_buyers_shop ON buyers(shop_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_shop ON notifications(shop_id);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
    CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
  `,
  4: `
    ALTER TABLE products ADD COLUMN sku TEXT;
    ALTER TABLE products ADD COLUMN barcode TEXT;
  `,
  5: `
    ALTER TABLE shops ADD COLUMN owner_id TEXT;
    ALTER TABLE shops RENAME COLUMN name TO shop_name;
    ALTER TABLE shops RENAME COLUMN mobile TO phone;
    ALTER TABLE shops RENAME COLUMN logo_url TO logo;

    ALTER TABLE users ADD COLUMN password_hash TEXT;
    ALTER TABLE users ADD COLUMN mobile TEXT;
    ALTER TABLE users ADD COLUMN updated_at TEXT;
    ALTER TABLE users ADD COLUMN last_login TEXT;
    ALTER TABLE users RENAME COLUMN name TO full_name;

    ALTER TABLE customers RENAME COLUMN gst TO gst_number;

    ALTER TABLE products RENAME COLUMN name TO product_name;
    ALTER TABLE products RENAME COLUMN price TO rate;
    ALTER TABLE products RENAME COLUMN tax_rate TO gst;

    ALTER TABLE invoices RENAME COLUMN date TO invoice_date;
    ALTER TABLE invoices RENAME COLUMN tax_amount TO gst;
    ALTER TABLE invoices RENAME COLUMN discount_amount TO discount;
    ALTER TABLE invoices RENAME COLUMN transport_charge TO transport;
    ALTER TABLE invoices RENAME COLUMN packing_charge TO packing;
    ALTER TABLE invoices RENAME COLUMN other_charge TO other_charges;
    ALTER TABLE invoices RENAME COLUMN advance_payment TO advance_paid;
    ALTER TABLE invoices RENAME COLUMN total TO grand_total;
    ALTER TABLE invoices RENAME COLUMN outstanding TO pending_amount;

    ALTER TABLE invoice_items ADD COLUMN product_id TEXT;
    ALTER TABLE invoice_items RENAME COLUMN price TO rate;
    ALTER TABLE invoice_items RENAME COLUMN tax_rate TO gst;
    ALTER TABLE invoice_items RENAME COLUMN amount TO total;

    ALTER TABLE payments RENAME COLUMN method TO payment_mode;
    ALTER TABLE payments RENAME COLUMN date TO payment_date;
  `,
  6: `
    ALTER TABLE customers ADD COLUMN deleted_at TEXT;
    ALTER TABLE buyers ADD COLUMN deleted_at TEXT;
    ALTER TABLE products ADD COLUMN deleted_at TEXT;
    ALTER TABLE invoices ADD COLUMN deleted_at TEXT;
    ALTER TABLE payments ADD COLUMN deleted_at TEXT;
  `,
};


