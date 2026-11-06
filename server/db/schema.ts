import Database from 'better-sqlite3';

export interface ProductRow {
  id: number;
  code: string;
  description: string | null;
  origin: string | null;
  category: string | null;
  added_on: number | null;
  updated_on: number | null;
}

export interface StockRow {
  id: number;
  product_id: number;
  quantity_sqft: number | null;
  updated_on: number | null;
}

export interface CurrentAccountRow {
  id: number;
  code: string | null;
  description: string | null;
  balance: number | null;
  updated_on: number | null;
}

export interface CATransactionRow {
  id: number;
  code: string | null;
  type: string | null; // 'AD' | 'BD' | 'NT' | 'NP'
  amount: number | null;
  current_account_id: number | null;
  date: number | null;
  note: string | null;
}

export interface StockMovementRow {
  id: number;
  product_id: number;
  type: 'D' | 'G' | 'F'; // 'D' (Devir Fisi), 'G' (Uretimden Giris), 'F' (Fire Fisi)
  quantity_sqft: number;
  date: number;
}

export interface InvoiceRow {
  id: number;
  code: string;
  type: 'ALIS' | 'SATIS' | 'ALIS_IADE' | 'SATIS_IADE';
  currency: 'TRY' | 'USD';
  product_id: number | null;
  current_account_id: number | null;
  date: number | null;
  amount: number | null;
  description: string | null;
}

export interface InvoiceItemRow {
  id: number;
  invoice_id: number;
  product_id: number | null;
  quantity_sqft: number;
  unit_price: number;
  total_price: number;
}

export interface CashRegisterRow {
  id: number;
  code: string | null;
  description: string;
  balance: number | null;
  updated_on: number | null;
}

export interface ChequeNoteRow {
  id: number;
  document_type: 'CEK' | 'SENET';
  portfolio_type: 'ALINAN' | 'VERILEN';
  document_number: string | null;
  due_date: number | null;
  amount: number | null;
  current_account_id: number | null;
  status: string | null;
  description: string | null;
  updated_on: number | null;
}

/**
 * Initializes all database tables non-destructively in lightbase.db
 */
export function initDatabase(db: Database.Database): void {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // 1. Core Inventory & Current Account Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS Product (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      description TEXT,
      origin TEXT,
      stock REAL,
      category TEXT,
      added_on INTEGER,
      updated_on INTEGER
    );

    -- Separate relational Stock table (in sqft)
    CREATE TABLE IF NOT EXISTS Stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL UNIQUE,
      quantity_sqft REAL DEFAULT 0,
      updated_on INTEGER,
      FOREIGN KEY (product_id) REFERENCES Product(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS CurrentAccount (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT,
      description TEXT,
      balance REAL,
      updated_on INTEGER
    );

    CREATE TABLE IF NOT EXISTS CATransaction (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT,
      type TEXT, -- 'AD', 'BD', 'NT', 'NP'
      amount REAL,
      current_account_id INTEGER,
      date INTEGER,
      note TEXT,
      FOREIGN KEY (current_account_id) REFERENCES CurrentAccount(id) ON DELETE CASCADE
    );

    -- Stok Hareketleri (Stock Movements: D, G, F)
    CREATE TABLE IF NOT EXISTS StockMovement (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'D' (Devir Fisi), 'G' (Uretimden Giris), 'F' (Fire Fisi)
      quantity_sqft REAL NOT NULL,
      date INTEGER NOT NULL,
      FOREIGN KEY (product_id) REFERENCES Product(id) ON DELETE CASCADE
    );

    -- Legacy product transactions table preserved for historical compatibility
    CREATE TABLE IF NOT EXISTS ProductTransaction (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code INTEGER,
      type TEXT,
      quantity REAL,
      price REAL,
      product_id INTEGER,
      date INTEGER,
      FOREIGN KEY (product_id) REFERENCES Product(id) ON DELETE CASCADE
    );

    -- 2. Commercial Modules

    -- Faturalar (Invoices)
    CREATE TABLE IF NOT EXISTS Invoice (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      type TEXT NOT NULL, -- 'ALIS', 'SATIS', 'ALIS_IADE', 'SATIS_IADE'
      currency TEXT DEFAULT 'USD', -- Single currency USD
      product_id INTEGER,
      current_account_id INTEGER,
      date INTEGER,
      amount REAL,
      description TEXT,
      FOREIGN KEY (product_id) REFERENCES Product(id) ON DELETE SET NULL,
      FOREIGN KEY (current_account_id) REFERENCES CurrentAccount(id) ON DELETE SET NULL
    );

    -- Fatura Kalemleri (Invoice Line Items)
    CREATE TABLE IF NOT EXISTS InvoiceItem (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      product_id INTEGER,
      quantity_sqft REAL NOT NULL DEFAULT 0,
      unit_price REAL NOT NULL DEFAULT 0,
      total_price REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (invoice_id) REFERENCES Invoice(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES Product(id) ON DELETE SET NULL
    );

    -- Kasa (Cash Register)
    CREATE TABLE IF NOT EXISTS CashRegister (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT,
      description TEXT NOT NULL,
      balance REAL DEFAULT 0,
      updated_on INTEGER
    );

    -- Çek ve Senet (Cheques & Promissory Notes)
    CREATE TABLE IF NOT EXISTS ChequeNote (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_type TEXT NOT NULL, -- 'CEK', 'SENET'
      portfolio_type TEXT NOT NULL, -- 'ALINAN', 'VERILEN'
      document_number TEXT,
      due_date INTEGER,
      amount REAL,
      current_account_id INTEGER,
      status TEXT DEFAULT 'PORTFOYDE', -- 'PORTFOYDE', 'TAHSIL_EDILDI', 'ODENDI', vb.
      description TEXT,
      updated_on INTEGER,
      FOREIGN KEY (current_account_id) REFERENCES CurrentAccount(id) ON DELETE SET NULL
    );
  `);

  // Migrations for existing database columns
  const caColumns = db.prepare('PRAGMA table_info(CurrentAccount)').all() as Array<{ name: string }>;
  if (!caColumns.some((c) => c.name === 'code')) {
    db.exec('ALTER TABLE CurrentAccount ADD COLUMN code TEXT');
  }

  const catxColumns = db.prepare('PRAGMA table_info(CATransaction)').all() as Array<{ name: string }>;
  if (!catxColumns.some((c) => c.name === 'note')) {
    db.exec('ALTER TABLE CATransaction ADD COLUMN note TEXT');
  }

  // Ensure Invoice table has currency and product_id columns if created prior
  const invoiceColumns = db.prepare('PRAGMA table_info(Invoice)').all() as Array<{ name: string }>;
  const colNames = invoiceColumns.map((c) => c.name);
  if (!colNames.includes('currency')) {
    db.exec("ALTER TABLE Invoice ADD COLUMN currency TEXT DEFAULT 'USD'");
  } else {
    // Migrate legacy default to USD
    db.exec("UPDATE Invoice SET currency = 'USD' WHERE currency = 'TRY' OR currency IS NULL");
  }
  if (!colNames.includes('product_id')) {
    db.exec('ALTER TABLE Invoice ADD COLUMN product_id INTEGER REFERENCES Product(id) ON DELETE SET NULL');
  }
  if (!colNames.includes('status')) {
    db.exec("ALTER TABLE Invoice ADD COLUMN status TEXT DEFAULT 'ACTIVE'");
  }

  // Ensure default CashRegister description is 'Işıksan Deri'
  db.exec("UPDATE CashRegister SET description = 'Işıksan Deri' WHERE description = 'Merkez TL Kasası' OR description = 'Merkez Kasası'");

  // Backfill CurrentAccount code if missing (e.g. Z.0001, Z.0002)
  const accountsWithoutCode = db.prepare("SELECT id FROM CurrentAccount WHERE code IS NULL OR code = '' ORDER BY id ASC").all() as Array<{ id: number }>;
  let backfillCounter = 1;
  const updateCodeStmt = db.prepare('UPDATE CurrentAccount SET code = ? WHERE id = ?');
  for (const acc of accountsWithoutCode) {
    const code = `Z.${String(backfillCounter).padStart(4, '0')}`;
    updateCodeStmt.run(code, acc.id);
    backfillCounter++;
  }

  // Seed default data if completely brand new
  const productCount = (db.prepare('SELECT count(*) as count FROM Product').get() as { count: number }).count;
  if (productCount === 0) {
    db.prepare(`
      INSERT INTO Product (id, code, description, origin, stock, category, added_on, updated_on)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(1, 'Z.2.26.486', 'Jumbo Siyah Nappa', 'Pakistan', 1400.0, 'Naturel', Date.now(), Date.now());
  }

  // Non-destructive data migration: sync existing product stocks into Stock table
  const now = Date.now();
  db.prepare(`
    INSERT OR IGNORE INTO Stock (product_id, quantity_sqft, updated_on)
    SELECT id, COALESCE(stock, 0), COALESCE(updated_on, ?) FROM Product
  `).run(now);

  const accountCount = (db.prepare('SELECT count(*) as count FROM CurrentAccount').get() as { count: number }).count;
  if (accountCount === 0) {
    db.prepare(`
      INSERT INTO CurrentAccount (id, description, balance, updated_on)
      VALUES (?, ?, ?, ?)
    `).run(2, 'Seçim Çanta', 2000.0, Date.now());
  }

  const caTxCount = (db.prepare('SELECT count(*) as count FROM CATransaction').get() as { count: number }).count;
  if (caTxCount === 0) {
    db.prepare(`
      INSERT INTO CATransaction (id, code, type, amount, current_account_id, date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(1, 'NT-26-0001', 'NT', 120.0, 2, Date.now());
  }

  // Seed initial sample invoice if Invoice table is empty
  const invoiceCount = (db.prepare('SELECT count(*) as count FROM Invoice').get() as { count: number }).count;
  if (invoiceCount === 0) {
    const invInfo = db.prepare(`
      INSERT INTO Invoice (code, type, currency, product_id, current_account_id, date, amount, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('S-26-0001', 'SATIS', 'TRY', 1, 2, Date.now(), 2450.0, 'Örnek Satış Faturası');

    db.prepare(`
      INSERT INTO InvoiceItem (invoice_id, product_id, quantity_sqft, unit_price, total_price)
      VALUES (?, ?, ?, ?, ?)
    `).run(invInfo.lastInsertRowid, 1, 100, 24.5, 2450.0);
  }

  // Ensure all existing invoices with a product_id have at least one InvoiceItem row
  db.prepare(`
    INSERT INTO InvoiceItem (invoice_id, product_id, quantity_sqft, unit_price, total_price)
    SELECT i.id, i.product_id, 100, ROUND(COALESCE(i.amount, 0) / 100.0, 2), COALESCE(i.amount, 0)
    FROM Invoice i
    WHERE i.product_id IS NOT NULL 
      AND i.id NOT IN (SELECT DISTINCT invoice_id FROM InvoiceItem)
  `).run();

  // Seed initial sample cash register if empty
  const cashCount = (db.prepare('SELECT count(*) as count FROM CashRegister').get() as { count: number }).count;
  if (cashCount === 0) {
    db.prepare(`
      INSERT INTO CashRegister (code, description, balance, updated_on)
      VALUES (?, ?, ?, ?)
    `).run('KASA-01', 'Işıksan Deri', 15000.0, Date.now());
  }

  // Seed initial sample cheque if empty
  const chequeCount = (db.prepare('SELECT count(*) as count FROM ChequeNote').get() as { count: number }).count;
  if (chequeCount === 0) {
    db.prepare(`
      INSERT INTO ChequeNote (document_type, portfolio_type, document_number, due_date, amount, current_account_id, status, description, updated_on)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('CEK', 'ALINAN', 'CK-98421', Date.now() + 30 * 24 * 60 * 60 * 1000, 10000.0, 2, 'PORTFOYDE', 'Müşteri Çeki', Date.now());
  }
}
