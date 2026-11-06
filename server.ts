import express, { Request, Response } from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './server/db/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'lightbase.db');
const db = new Database(dbPath);

// Initialize modular schema
initDatabase(db);

const app = express();
app.use(cors());
app.use(express.json());

// --- FINANCIAL, STOCK & CASH AUTOMATION HELPERS ---
function adjustAccountBalance(accountId: number | null | undefined, delta: number) {
  if (!accountId || delta === 0) return;
  const now = Date.now();
  db.prepare('UPDATE CurrentAccount SET balance = COALESCE(balance, 0) + ?, updated_on = ? WHERE id = ?').run(
    delta,
    now,
    accountId
  );
}

function adjustCashRegisterBalance(delta: number) {
  if (delta === 0) return;
  const now = Date.now();
  const cashReg: any = db.prepare('SELECT id FROM CashRegister ORDER BY id ASC LIMIT 1').get();
  if (cashReg) {
    db.prepare('UPDATE CashRegister SET balance = COALESCE(balance, 0) + ?, updated_on = ? WHERE id = ?').run(
      delta,
      now,
      cashReg.id
    );
  } else {
    db.prepare('INSERT INTO CashRegister (code, description, balance, updated_on) VALUES (?, ?, ?, ?)').run(
      'KASA-01',
      'Işıksan Deri',
      delta,
      now
    );
  }
}

function adjustProductStock(productId: number | null | undefined, deltaSqft: number) {
  if (!productId || deltaSqft === 0) return;
  const now = Date.now();
  const existingStock: any = db.prepare('SELECT id, quantity_sqft FROM Stock WHERE product_id = ?').get(productId);
  if (existingStock) {
    const newQty = Math.max(0, (existingStock.quantity_sqft || 0) + deltaSqft);
    db.prepare('UPDATE Stock SET quantity_sqft = ?, updated_on = ? WHERE id = ?').run(newQty, now, existingStock.id);
  } else {
    const initQty = Math.max(0, deltaSqft);
    db.prepare('INSERT INTO Stock (product_id, quantity_sqft, updated_on) VALUES (?, ?, ?)').run(productId, initQty, now);
  }
  // Sync Product.stock
  const totalStock: any = db.prepare('SELECT quantity_sqft FROM Stock WHERE product_id = ?').get(productId);
  db.prepare('UPDATE Product SET stock = ?, updated_on = ? WHERE id = ?').run(
    totalStock?.quantity_sqft ?? 0,
    now,
    productId
  );
}

// --- DATABASE BACKUP ENDPOINT ---
app.get('/api/backup/db', (_req: Request, res: Response) => {
  try {
    // Force a full WAL checkpoint to ensure all uncommitted WAL pages are flushed into lightbase.db
    db.pragma('wal_checkpoint(TRUNCATE)');

    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database file not found' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const downloadName = `lightbase_${timestamp}.db`;

    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.sendFile(dbPath);
  } catch (err) {
    console.error('Backup error:', err);
    res.status(500).json({ error: 'Failed to create database backup' });
  }
});

// --- PRODUCTS ---
app.get('/api/products', (req: Request, res: Response) => {
  const q = req.query.search as string;
  let rows;
  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    rows = db
      .prepare(
        `SELECT p.id, p.code, p.description, p.origin, p.category, p.added_on, p.updated_on,
                COALESCE(s.quantity_sqft, 0) as stock_sqft
         FROM Product p
         LEFT JOIN Stock s ON p.id = s.product_id
         WHERE p.code LIKE ? OR p.description LIKE ? OR p.origin LIKE ? OR p.category LIKE ?
         ORDER BY p.id DESC`
      )
      .all(term, term, term, term);
  } else {
    rows = db
      .prepare(
        `SELECT p.id, p.code, p.description, p.origin, p.category, p.added_on, p.updated_on,
                COALESCE(s.quantity_sqft, 0) as stock_sqft
         FROM Product p
         LEFT JOIN Stock s ON p.id = s.product_id
         ORDER BY p.id ASC`
      )
      .all();
  }
  const formatted = rows.map((r: any) => ({
    id: r.id,
    code: r.code,
    description: r.description,
    origin: r.origin,
    stock: r.stock_sqft,
    category: r.category,
    addedOn: r.added_on,
    updatedOn: r.updated_on,
  }));
  res.json(formatted);
});

app.get('/api/products/:id', (req: Request, res: Response) => {
  const row: any = db
    .prepare(
      `SELECT p.id, p.code, p.description, p.origin, p.category, p.added_on, p.updated_on,
              COALESCE(s.quantity_sqft, 0) as stock_sqft
       FROM Product p
       LEFT JOIN Stock s ON p.id = s.product_id
       WHERE p.id = ?`
    )
    .get(req.params.id);

  if (!row) return res.status(404).json({ error: 'Product not found' });
  res.json({
    id: row.id,
    code: row.code,
    description: row.description,
    origin: row.origin,
    stock: row.stock_sqft,
    category: row.category,
    addedOn: row.added_on,
    updatedOn: row.updated_on,
  });
});

app.post('/api/products', (req: Request, res: Response) => {
  const { code, description, origin, stock, initialStock, category, addedOn, updatedOn } = req.body;
  if (!code) return res.status(400).json({ error: 'Code is required' });

  const stmt = db.prepare(`
    INSERT INTO Product (code, description, origin, category, added_on, updated_on)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const now = Date.now();
  const info = stmt.run(
    code,
    description ?? null,
    origin ?? null,
    category ?? null,
    addedOn !== undefined && addedOn !== null ? Number(addedOn) : now,
    updatedOn !== undefined && updatedOn !== null ? Number(updatedOn) : now
  );

  const productId = Number(info.lastInsertRowid);
  const stockQty = initialStock !== undefined && initialStock !== null
    ? Number(initialStock)
    : stock !== undefined && stock !== null
    ? Number(stock)
    : 0;

  // Insert into separate Stock table
  db.prepare(`
    INSERT INTO Stock (product_id, quantity_sqft, updated_on)
    VALUES (?, ?, ?)
    ON CONFLICT(product_id) DO UPDATE SET quantity_sqft = excluded.quantity_sqft, updated_on = excluded.updated_on
  `).run(productId, stockQty, now);

  res.status(201).json({ id: productId, stock: stockQty, ...req.body });
});

app.put('/api/products/:id', (req: Request, res: Response) => {
  const { code, description, origin, stock, initialStock, category, addedOn, updatedOn } = req.body;
  const id = Number(req.params.id);

  const stmt = db.prepare(`
    UPDATE Product
    SET code = ?, description = ?, origin = ?, category = ?, added_on = ?, updated_on = ?
    WHERE id = ?
  `);
  const now = Date.now();
  stmt.run(
    code,
    description ?? null,
    origin ?? null,
    category ?? null,
    addedOn !== undefined && addedOn !== null ? Number(addedOn) : null,
    updatedOn !== undefined && updatedOn !== null ? Number(updatedOn) : now,
    id
  );

  const stockQty = initialStock !== undefined && initialStock !== null
    ? Number(initialStock)
    : stock !== undefined && stock !== null
    ? Number(stock)
    : null;

  if (stockQty !== null) {
    db.prepare(`
      INSERT INTO Stock (product_id, quantity_sqft, updated_on)
      VALUES (?, ?, ?)
      ON CONFLICT(product_id) DO UPDATE SET quantity_sqft = excluded.quantity_sqft, updated_on = excluded.updated_on
    `).run(id, stockQty, now);
  }

  res.json({ id, ...req.body });
});

app.delete('/api/products/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  db.prepare('DELETE FROM Stock WHERE product_id = ?').run(id);
  db.prepare('DELETE FROM Product WHERE id = ?').run(id);
  res.json({ success: true });
});

// --- CURRENT ACCOUNTS ---

// Next CurrentAccount Code Generator Endpoint (Z.0001, B.0001)
app.get('/api/current-accounts/next-code', (req: Request, res: Response) => {
  const branchParam = req.query.branch as string;
  const branch = branchParam === 'B' ? 'B' : 'Z';

  const pattern = `${branch}.%`;
  const rows = db
    .prepare('SELECT code FROM CurrentAccount WHERE code LIKE ?')
    .all(pattern) as Array<{ code: any }>;

  let maxNum = 0;
  for (const r of rows) {
    if (r.code) {
      const parts = String(r.code).split('.');
      if (parts.length >= 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  const nextNum = maxNum + 1;
  const padded = String(nextNum).padStart(4, '0');
  const nextCode = `${branch}.${padded}`;

  res.json({
    nextCode,
    branch,
    counter: nextNum,
  });
});

app.get('/api/current-accounts', (req: Request, res: Response) => {
  const q = req.query.search as string;
  let rows;
  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    rows = db
      .prepare('SELECT id, code, description, balance, updated_on FROM CurrentAccount WHERE code LIKE ? OR description LIKE ? ORDER BY id DESC')
      .all(term, term);
  } else {
    rows = db.prepare('SELECT id, code, description, balance, updated_on FROM CurrentAccount ORDER BY id ASC').all();
  }
  const formatted = rows.map((r: any) => ({
    id: r.id,
    code: r.code,
    description: r.description,
    balance: r.balance,
    updatedOn: r.updated_on,
  }));
  res.json(formatted);
});

app.get('/api/current-accounts/:id', (req: Request, res: Response) => {
  const row: any = db.prepare('SELECT id, code, description, balance, updated_on FROM CurrentAccount WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Account not found' });
  res.json({
    id: row.id,
    code: row.code,
    description: row.description,
    balance: row.balance,
    updatedOn: row.updated_on,
  });
});

app.post('/api/current-accounts', (req: Request, res: Response) => {
  let { code, branch, description, balance, updatedOn } = req.body;
  if (!code) {
    const selectedBranch = branch === 'B' ? 'B' : 'Z';
    const pattern = `${selectedBranch}.%`;
    const rows = db.prepare('SELECT code FROM CurrentAccount WHERE code LIKE ?').all(pattern) as Array<{ code: any }>;
    let maxNum = 0;
    for (const r of rows) {
      if (r.code) {
        const parts = String(r.code).split('.');
        if (parts.length >= 2) {
          const num = parseInt(parts[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
    }
    code = `${selectedBranch}.${String(maxNum + 1).padStart(4, '0')}`;
  }

  const stmt = db.prepare(`
    INSERT INTO CurrentAccount (code, description, balance, updated_on)
    VALUES (?, ?, ?, ?)
  `);
  const now = Date.now();
  const info = stmt.run(
    code,
    description ?? null,
    balance !== undefined && balance !== null ? Number(balance) : null,
    updatedOn !== undefined && updatedOn !== null ? Number(updatedOn) : now
  );
  res.status(201).json({ id: info.lastInsertRowid, code, description, balance, updatedOn });
});

app.put('/api/current-accounts/:id', (req: Request, res: Response) => {
  const { code, description, balance, updatedOn } = req.body;
  const id = req.params.id;
  const stmt = db.prepare(`
    UPDATE CurrentAccount
    SET code = ?, description = ?, balance = ?, updated_on = ?
    WHERE id = ?
  `);
  const now = Date.now();
  stmt.run(
    code ?? null,
    description ?? null,
    balance !== undefined && balance !== null ? Number(balance) : null,
    updatedOn !== undefined && updatedOn !== null ? Number(updatedOn) : now,
    id
  );
  res.json({ id: Number(id), code, description, balance, updatedOn });
});

app.delete('/api/current-accounts/:id', (req: Request, res: Response) => {
  db.prepare('DELETE FROM CurrentAccount WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- CATRANSACTIONS ---

// Next CATransaction Code Generator Endpoint (AD-26-0001, BD-26-0001, NT-26-0001, NP-26-0001)
app.get('/api/catransactions/next-code', (req: Request, res: Response) => {
  const type = (req.query.type as string) || 'NT';
  let yearParam = req.query.year as string;
  if (!yearParam) {
    yearParam = String(new Date().getFullYear()).slice(-2);
  } else if (yearParam.length > 2) {
    yearParam = yearParam.slice(-2);
  }

  // 4 Types: AD, BD, NT, NP
  let prefix = 'NT';
  if (['AD', 'BD', 'NT', 'NP'].includes(type)) {
    prefix = type;
  }

  const pattern = `${prefix}-${yearParam}-%`;
  const rows = db
    .prepare('SELECT code FROM CATransaction WHERE code LIKE ?')
    .all(pattern) as Array<{ code: any }>;

  let maxNum = 0;
  for (const r of rows) {
    if (r.code) {
      const parts = String(r.code).split('-');
      if (parts.length >= 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  const nextNum = maxNum + 1;
  const padded = String(nextNum).padStart(4, '0');
  const nextCode = `${prefix}-${yearParam}-${padded}`;

  res.json({
    nextCode,
    prefix,
    year: yearParam,
    counter: nextNum,
  });
});

app.get('/api/catransactions', (req: Request, res: Response) => {
  const rows: any = db
    .prepare(
      `
    SELECT 
      t.id, t.code, t.type, t.amount, t.current_account_id, t.date, t.note,
      a.description as account_description, a.balance as account_balance
    FROM CATransaction t
    LEFT JOIN CurrentAccount a ON t.current_account_id = a.id
    ORDER BY t.id ASC
  `
    )
    .all();

  const formatted = rows.map((r: any) => ({
    id: r.id,
    code: r.code !== null && r.code !== undefined ? String(r.code) : null,
    type: r.type,
    amount: r.amount,
    currentAccountId: r.current_account_id,
    date: r.date,
    note: r.note ?? null,
    currentAccount: r.current_account_id
      ? {
          id: r.current_account_id,
          description: r.account_description,
          balance: r.account_balance,
        }
      : null,
  }));
  res.json(formatted);
});

app.post('/api/catransactions', (req: Request, res: Response) => {
  const { code, type, amount, currentAccountId, date, note } = req.body;
  const sanitizedNote = note ? String(note).slice(0, 250) : null;
  const txType = type ?? 'NT';
  const amt = amount !== undefined && amount !== null ? Number(amount) : 0;
  const accId = currentAccountId !== undefined && currentAccountId !== null ? Number(currentAccountId) : null;
  const now = Date.now();

  let caDelta = 0;
  let cashDelta = 0;
  if (txType === 'NT' || txType === 'AD') {
    caDelta = -amt;
    cashDelta = +amt;
  } else if (txType === 'NP' || txType === 'BD') {
    caDelta = +amt;
    cashDelta = -amt;
  }

  const tx = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO CATransaction (code, type, amount, current_account_id, date, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      code ? String(code) : null,
      txType,
      amt,
      accId,
      date !== undefined && date !== null ? Number(date) : now,
      sanitizedNote
    );

    if (accId && caDelta !== 0) {
      adjustAccountBalance(accId, caDelta);
    }
    if (cashDelta !== 0) {
      adjustCashRegisterBalance(cashDelta);
    }
    return info.lastInsertRowid;
  });

  const insertedId = tx();
  res.status(201).json({ id: insertedId, ...req.body, note: sanitizedNote });
});

app.put('/api/catransactions/:id', (req: Request, res: Response) => {
  const { code, type, amount, currentAccountId, date, note } = req.body;
  const sanitizedNote = note ? String(note).slice(0, 250) : null;
  const id = req.params.id;

  const oldRow: any = db.prepare('SELECT * FROM CATransaction WHERE id = ?').get(id);
  if (!oldRow) return res.status(404).json({ error: 'Transaction not found' });

  const oldAmt = Number(oldRow.amount || 0);
  let oldCaDelta = 0;
  let oldCashDelta = 0;
  if (oldRow.type === 'NT' || oldRow.type === 'AD') {
    oldCaDelta = -oldAmt;
    oldCashDelta = +oldAmt;
  } else if (oldRow.type === 'NP' || oldRow.type === 'BD') {
    oldCaDelta = +oldAmt;
    oldCashDelta = -oldAmt;
  }

  const newType = type ?? oldRow.type ?? 'NT';
  const newAmt = amount !== undefined && amount !== null ? Number(amount) : oldAmt;
  const newAccId = currentAccountId !== undefined && currentAccountId !== null ? Number(currentAccountId) : oldRow.current_account_id;

  let newCaDelta = 0;
  let newCashDelta = 0;
  if (newType === 'NT' || newType === 'AD') {
    newCaDelta = -newAmt;
    newCashDelta = +newAmt;
  } else if (newType === 'NP' || newType === 'BD') {
    newCaDelta = +newAmt;
    newCashDelta = -newAmt;
  }

  const tx = db.transaction(() => {
    // Revert old impact
    if (oldRow.current_account_id && oldCaDelta !== 0) {
      adjustAccountBalance(oldRow.current_account_id, -oldCaDelta);
    }
    if (oldCashDelta !== 0) {
      adjustCashRegisterBalance(-oldCashDelta);
    }

    // Apply new impact
    if (newAccId && newCaDelta !== 0) {
      adjustAccountBalance(newAccId, newCaDelta);
    }
    if (newCashDelta !== 0) {
      adjustCashRegisterBalance(newCashDelta);
    }

    const stmt = db.prepare(`
      UPDATE CATransaction
      SET code = ?, type = ?, amount = ?, current_account_id = ?, date = ?, note = ?
      WHERE id = ?
    `);
    stmt.run(
      code ? String(code) : null,
      newType,
      newAmt,
      newAccId,
      date !== undefined && date !== null ? Number(date) : null,
      sanitizedNote,
      id
    );
  });

  tx();
  res.json({ id: Number(id), ...req.body, note: sanitizedNote });
});

app.delete('/api/catransactions/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const row: any = db.prepare('SELECT * FROM CATransaction WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Transaction not found' });

  const amt = Number(row.amount || 0);
  let revCaDelta = 0;
  let revCashDelta = 0;
  if (row.type === 'NT' || row.type === 'AD') {
    revCaDelta = +amt;
    revCashDelta = -amt;
  } else if (row.type === 'NP' || row.type === 'BD') {
    revCaDelta = -amt;
    revCashDelta = +amt;
  }

  const tx = db.transaction(() => {
    if (row.current_account_id && revCaDelta !== 0) {
      adjustAccountBalance(row.current_account_id, revCaDelta);
    }
    if (revCashDelta !== 0) {
      adjustCashRegisterBalance(revCashDelta);
    }
    db.prepare('DELETE FROM CATransaction WHERE id = ?').run(id);
  });

  tx();
  res.json({ success: true });
});

// --- FATURALAR (INVOICES) ---

// Next Invoice Code Generator Endpoint (S-26-0001, A-26-0001, IA-26-0001, IS-26-0001)
app.get('/api/invoices/next-code', (req: Request, res: Response) => {
  const type = (req.query.type as string) || 'SATIS';
  let yearParam = req.query.year as string;
  if (!yearParam) {
    yearParam = String(new Date().getFullYear()).slice(-2);
  } else if (yearParam.length > 2) {
    yearParam = yearParam.slice(-2);
  }

  // Prefix mapping:
  // SATIS -> S
  // ALIS -> A
  // SATIS_IADE -> IS
  // ALIS_IADE -> IA
  let prefix = 'S';
  if (type === 'ALIS') prefix = 'A';
  else if (type === 'SATIS_IADE') prefix = 'IS';
  else if (type === 'ALIS_IADE') prefix = 'IA';
  else if (type === 'SATIS') prefix = 'S';

  const pattern = `${prefix}-${yearParam}-%`;
  const rows = db
    .prepare('SELECT code FROM Invoice WHERE code LIKE ?')
    .all(pattern) as Array<{ code: string }>;

  let maxNum = 0;
  for (const r of rows) {
    const parts = r.code.split('-');
    if (parts.length >= 3) {
      const num = parseInt(parts[2], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  const padded = String(nextNum).padStart(4, '0');
  const nextCode = `${prefix}-${yearParam}-${padded}`;

  res.json({
    nextCode,
    prefix,
    year: yearParam,
    counter: nextNum,
  });
});

app.get('/api/invoices', (req: Request, res: Response) => {
  const q = req.query.search as string;
  let rows: any;
  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    rows = db
      .prepare(
        `
      SELECT 
        i.id, i.code, i.type, i.currency, i.product_id, i.current_account_id, i.date, i.amount, i.description,
        COALESCE(i.status, 'ACTIVE') as status,
        a.code as account_code,
        a.description as account_description,
        p.code as product_code,
        p.description as product_description,
        p.origin as product_origin
      FROM Invoice i
      LEFT JOIN CurrentAccount a ON i.current_account_id = a.id
      LEFT JOIN Product p ON i.product_id = p.id
      WHERE i.code LIKE ? OR i.type LIKE ? OR i.description LIKE ? OR a.description LIKE ? OR a.code LIKE ? OR p.code LIKE ?
      ORDER BY i.id DESC
    `
      )
      .all(term, term, term, term, term, term);
  } else {
    rows = db
      .prepare(
        `
      SELECT 
        i.id, i.code, i.type, i.currency, i.product_id, i.current_account_id, i.date, i.amount, i.description,
        COALESCE(i.status, 'ACTIVE') as status,
        a.code as account_code,
        a.description as account_description,
        p.code as product_code,
        p.description as product_description,
        p.origin as product_origin
      FROM Invoice i
      LEFT JOIN CurrentAccount a ON i.current_account_id = a.id
      LEFT JOIN Product p ON i.product_id = p.id
      ORDER BY i.id DESC
    `
      )
      .all();
  }

  const itemStmt = db.prepare(`
    SELECT it.id, it.invoice_id, it.product_id, it.quantity_sqft, it.unit_price, it.total_price,
           p.code as product_code, p.description as product_description, p.origin as product_origin
    FROM InvoiceItem it
    LEFT JOIN Product p ON it.product_id = p.id
    WHERE it.invoice_id = ?
    ORDER BY it.id ASC
  `);

  const formatted = rows.map((r: any) => {
    const rawItems = itemStmt.all(r.id) as any[];
    const items = rawItems.map((it: any) => ({
      id: it.id,
      invoiceId: it.invoice_id,
      productId: it.product_id,
      quantitySqft: it.quantity_sqft,
      unitPrice: it.unit_price,
      totalPrice: it.total_price,
      product: it.product_id
        ? {
            id: it.product_id,
            code: it.product_code,
            description: it.product_description,
            origin: it.product_origin,
          }
        : null,
    }));

    return {
      id: r.id,
      code: r.code,
      type: r.type,
      currency: r.currency || 'USD',
      status: r.status || 'ACTIVE',
      productId: r.product_id,
      currentAccountId: r.current_account_id,
      date: r.date,
      amount: r.amount,
      description: r.description,
      currentAccount: r.current_account_id
        ? {
            id: r.current_account_id,
            code: r.account_code,
            description: r.account_description,
          }
        : null,
      product: r.product_id
        ? {
            id: r.product_id,
            code: r.product_code,
            description: r.product_description,
            origin: r.product_origin,
          }
        : null,
      items,
    };
  });
  res.json(formatted);
});

app.get('/api/invoices/:id', (req: Request, res: Response) => {
  const row: any = db
    .prepare(
      `
    SELECT 
      i.id, i.code, i.type, i.currency, i.product_id, i.current_account_id, i.date, i.amount, i.description,
      COALESCE(i.status, 'ACTIVE') as status,
      a.code as account_code,
      a.description as account_description,
      p.code as product_code,
      p.description as product_description,
      p.origin as product_origin
    FROM Invoice i
    LEFT JOIN CurrentAccount a ON i.current_account_id = a.id
    LEFT JOIN Product p ON i.product_id = p.id
    WHERE i.id = ?
  `
    )
    .get(req.params.id);

  if (!row) return res.status(404).json({ error: 'Invoice not found' });

  const rawItems = db
    .prepare(
      `
    SELECT it.id, it.invoice_id, it.product_id, it.quantity_sqft, it.unit_price, it.total_price,
           p.code as product_code, p.description as product_description, p.origin as product_origin
    FROM InvoiceItem it
    LEFT JOIN Product p ON it.product_id = p.id
    WHERE it.invoice_id = ?
    ORDER BY it.id ASC
  `
    )
    .all(row.id) as any[];

  const items = rawItems.map((it: any) => ({
    id: it.id,
    invoiceId: it.invoice_id,
    productId: it.product_id,
    quantitySqft: it.quantity_sqft,
    unitPrice: it.unit_price,
    totalPrice: it.total_price,
    product: it.product_id
      ? {
          id: it.product_id,
          code: it.product_code,
          description: it.product_description,
          origin: it.product_origin,
        }
      : null,
  }));

  res.json({
    id: row.id,
    code: row.code,
    type: row.type,
    currency: row.currency || 'USD',
    status: row.status || 'ACTIVE',
    productId: row.product_id,
    currentAccountId: row.current_account_id,
    date: row.date,
    amount: row.amount,
    description: row.description,
    currentAccount: row.current_account_id
      ? {
          id: row.current_account_id,
          code: row.account_code,
          description: row.account_description,
        }
      : null,
    product: row.product_id
      ? {
          id: row.product_id,
          code: row.product_code,
          description: row.product_description,
          origin: row.product_origin,
        }
      : null,
    items,
  });
});

app.post('/api/invoices', (req: Request, res: Response) => {
  const { code, type, currency, productId, currentAccountId, date, amount, description, items } = req.body;
  if (!code) return res.status(400).json({ error: 'Invoice code is required' });
  if (!type) return res.status(400).json({ error: 'Invoice type is required' });

  let computedTotal = 0;
  const validItems = Array.isArray(items) ? items : [];
  if (validItems.length > 0) {
    computedTotal = validItems.reduce(
      (sum: number, it: any) => sum + Number(it.quantitySqft || 0) * Number(it.unitPrice || 0),
      0
    );
  } else if (amount !== undefined && amount !== null) {
    computedTotal = Number(amount);
  }

  const mainProductId = productId !== undefined && productId !== null
    ? Number(productId)
    : validItems.length > 0 && validItems[0].productId
    ? Number(validItems[0].productId)
    : null;

  const insertInvoice = db.prepare(`
    INSERT INTO Invoice (code, type, currency, product_id, current_account_id, date, amount, description, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
  `);

  const insertItem = db.prepare(`
    INSERT INTO InvoiceItem (invoice_id, product_id, quantity_sqft, unit_price, total_price)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Cari hesap bakiye etkisi:
  // SATIS: +computedTotal, ALIS: -computedTotal, SATIS_IADE: -computedTotal, ALIS_IADE: +computedTotal
  let caDelta = 0;
  if (type === 'SATIS' || type === 'ALIS_IADE') {
    caDelta = +computedTotal;
  } else if (type === 'ALIS' || type === 'SATIS_IADE') {
    caDelta = -computedTotal;
  }

  const now = Date.now();
  const tx = db.transaction(() => {
    const info = insertInvoice.run(
      code,
      type,
      'USD',
      mainProductId,
      currentAccountId !== undefined && currentAccountId !== null ? Number(currentAccountId) : null,
      date !== undefined && date !== null ? Number(date) : now,
      computedTotal,
      description ?? null
    );

    const invoiceId = Number(info.lastInsertRowid);

    // Insert items & adjust stock
    for (const it of validItems) {
      const q = Number(it.quantitySqft || 0);
      const p = Number(it.unitPrice || 0);
      const rowTotal = Number(it.totalPrice !== undefined ? it.totalPrice : q * p);
      const itProdId = it.productId ? Number(it.productId) : null;
      insertItem.run(invoiceId, itProdId, q, p, rowTotal);

      // Stok etkisi:
      // SATIS veya ALIS_IADE: -q (stok azalır)
      // ALIS veya SATIS_IADE: +q (stok artar)
      if (itProdId && q > 0) {
        let stockDelta = 0;
        if (type === 'SATIS' || type === 'ALIS_IADE') {
          stockDelta = -q;
        } else if (type === 'ALIS' || type === 'SATIS_IADE') {
          stockDelta = +q;
        }
        if (stockDelta !== 0) {
          adjustProductStock(itProdId, stockDelta);
        }
      }
    }

    // Adjust current account balance
    if (currentAccountId && caDelta !== 0) {
      adjustAccountBalance(Number(currentAccountId), caDelta);
    }

    return invoiceId;
  });

  const invoiceId = tx();
  res.status(201).json({ id: invoiceId, ...req.body, currency: 'USD', status: 'ACTIVE', amount: computedTotal });
});

app.put('/api/invoices/:id', (req: Request, res: Response) => {
  const { code, type, currency, productId, currentAccountId, date, amount, description, items } = req.body;
  const id = Number(req.params.id);

  const existing: any = db.prepare('SELECT * FROM Invoice WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Invoice not found' });
  if (existing.status === 'CANCELLED') {
    return res.status(400).json({ error: 'İptal edilmiş fatura düzenlenemez' });
  }

  const oldItems = db.prepare('SELECT * FROM InvoiceItem WHERE invoice_id = ?').all(id) as any[];
  const oldAmount = Number(existing.amount || 0);
  const oldType = existing.type;
  const oldAccId = existing.current_account_id;

  let computedTotal = 0;
  const validItems = Array.isArray(items) ? items : [];
  if (validItems.length > 0) {
    computedTotal = validItems.reduce(
      (sum: number, it: any) => sum + Number(it.quantitySqft || 0) * Number(it.unitPrice || 0),
      0
    );
  } else if (amount !== undefined && amount !== null) {
    computedTotal = Number(amount);
  }

  const newType = type || oldType;
  const newAccId = currentAccountId !== undefined && currentAccountId !== null ? Number(currentAccountId) : oldAccId;

  const mainProductId = productId !== undefined && productId !== null
    ? Number(productId)
    : validItems.length > 0 && validItems[0].productId
    ? Number(validItems[0].productId)
    : null;

  const updateInvoice = db.prepare(`
    UPDATE Invoice
    SET code = ?, type = ?, currency = ?, product_id = ?, current_account_id = ?, date = ?, amount = ?, description = ?
    WHERE id = ?
  `);

  const deleteItems = db.prepare('DELETE FROM InvoiceItem WHERE invoice_id = ?');
  const insertItem = db.prepare(`
    INSERT INTO InvoiceItem (invoice_id, product_id, quantity_sqft, unit_price, total_price)
    VALUES (?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    // 1. REVERT OLD IMPACT
    let revOldCaDelta = 0;
    if (oldType === 'SATIS' || oldType === 'ALIS_IADE') {
      revOldCaDelta = -oldAmount;
    } else if (oldType === 'ALIS' || oldType === 'SATIS_IADE') {
      revOldCaDelta = +oldAmount;
    }
    if (oldAccId && revOldCaDelta !== 0) {
      adjustAccountBalance(oldAccId, revOldCaDelta);
    }

    for (const it of oldItems) {
      const q = Number(it.quantity_sqft || 0);
      if (it.product_id && q > 0) {
        let revStock = 0;
        if (oldType === 'SATIS' || oldType === 'ALIS_IADE') {
          revStock = +q;
        } else if (oldType === 'ALIS' || oldType === 'SATIS_IADE') {
          revStock = -q;
        }
        if (revStock !== 0) {
          adjustProductStock(it.product_id, revStock);
        }
      }
    }

    // 2. APPLY NEW IMPACT
    let newCaDelta = 0;
    if (newType === 'SATIS' || newType === 'ALIS_IADE') {
      newCaDelta = +computedTotal;
    } else if (newType === 'ALIS' || newType === 'SATIS_IADE') {
      newCaDelta = -computedTotal;
    }
    if (newAccId && newCaDelta !== 0) {
      adjustAccountBalance(newAccId, newCaDelta);
    }

    updateInvoice.run(
      code,
      newType,
      'USD',
      mainProductId,
      newAccId,
      date !== undefined && date !== null ? Number(date) : null,
      computedTotal,
      description ?? null,
      id
    );

    deleteItems.run(id);
    for (const it of validItems) {
      const q = Number(it.quantitySqft || 0);
      const p = Number(it.unitPrice || 0);
      const rowTotal = Number(it.totalPrice !== undefined ? it.totalPrice : q * p);
      const itProdId = it.productId ? Number(it.productId) : null;
      insertItem.run(id, itProdId, q, p, rowTotal);

      if (itProdId && q > 0) {
        let stockDelta = 0;
        if (newType === 'SATIS' || newType === 'ALIS_IADE') {
          stockDelta = -q;
        } else if (newType === 'ALIS' || newType === 'SATIS_IADE') {
          stockDelta = +q;
        }
        if (stockDelta !== 0) {
          adjustProductStock(itProdId, stockDelta);
        }
      }
    }
  });

  tx();
  res.json({ id, ...req.body, currency: 'USD', status: 'ACTIVE', amount: computedTotal });
});

// Fatura İptal Etme Endpoint'i (Cancel Invoice)
app.post('/api/invoices/:id/cancel', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const inv: any = db.prepare('SELECT * FROM Invoice WHERE id = ?').get(id);
  if (!inv) return res.status(404).json({ error: 'Fatura bulunamadı' });
  if (inv.status === 'CANCELLED') {
    return res.status(400).json({ error: 'Bu fatura zaten iptal edilmiştir' });
  }

  const items = db.prepare('SELECT * FROM InvoiceItem WHERE invoice_id = ?').all(id) as any[];
  const invAmount = Number(inv.amount || 0);

  // Cari hesap ters bakiye düzeltmesi:
  let revCaDelta = 0;
  if (inv.type === 'SATIS' || inv.type === 'ALIS_IADE') {
    revCaDelta = -invAmount;
  } else if (inv.type === 'ALIS' || inv.type === 'SATIS_IADE') {
    revCaDelta = +invAmount;
  }

  const tx = db.transaction(() => {
    db.prepare("UPDATE Invoice SET status = 'CANCELLED' WHERE id = ?").run(id);

    // Cari bakiye geri al
    if (inv.current_account_id && revCaDelta !== 0) {
      adjustAccountBalance(inv.current_account_id, revCaDelta);
    }

    // Stokları geri al
    for (const it of items) {
      const q = Number(it.quantity_sqft || 0);
      if (it.product_id && q > 0) {
        let revStockDelta = 0;
        if (inv.type === 'SATIS' || inv.type === 'ALIS_IADE') {
          revStockDelta = +q; // düşülen stok geri eklendi
        } else if (inv.type === 'ALIS' || inv.type === 'SATIS_IADE') {
          revStockDelta = -q; // eklenen stok geri düşüldü
        }
        if (revStockDelta !== 0) {
          adjustProductStock(it.product_id, revStockDelta);
        }
      }
    }
  });

  tx();
  res.json({ success: true, id, status: 'CANCELLED' });
});

// DELETE endpoint behaves safely as cancel to protect accounting audit trail
app.delete('/api/invoices/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const inv: any = db.prepare('SELECT * FROM Invoice WHERE id = ?').get(id);
  if (!inv) return res.status(404).json({ error: 'Fatura bulunamadı' });

  if (inv.status === 'CANCELLED') {
    return res.json({ success: true, message: 'Fatura zaten iptal edilmiş', status: 'CANCELLED' });
  }

  // Perform cancellation
  const items = db.prepare('SELECT * FROM InvoiceItem WHERE invoice_id = ?').all(id) as any[];
  const invAmount = Number(inv.amount || 0);

  let revCaDelta = 0;
  if (inv.type === 'SATIS' || inv.type === 'ALIS_IADE') {
    revCaDelta = -invAmount;
  } else if (inv.type === 'ALIS' || inv.type === 'SATIS_IADE') {
    revCaDelta = +invAmount;
  }

  const tx = db.transaction(() => {
    db.prepare("UPDATE Invoice SET status = 'CANCELLED' WHERE id = ?").run(id);

    if (inv.current_account_id && revCaDelta !== 0) {
      adjustAccountBalance(inv.current_account_id, revCaDelta);
    }

    for (const it of items) {
      const q = Number(it.quantity_sqft || 0);
      if (it.product_id && q > 0) {
        let revStockDelta = 0;
        if (inv.type === 'SATIS' || inv.type === 'ALIS_IADE') {
          revStockDelta = +q;
        } else if (inv.type === 'ALIS' || inv.type === 'SATIS_IADE') {
          revStockDelta = -q;
        }
        if (revStockDelta !== 0) {
          adjustProductStock(it.product_id, revStockDelta);
        }
      }
    }
  });

  tx();
  res.json({ success: true, id, status: 'CANCELLED', message: 'Fatura iptal edildi' });
});

// --- STOCKS (RELATIONAL FT2 STORAGE) ---
app.get('/api/stocks', (_req: Request, res: Response) => {
  const rows: any = db
    .prepare(
      `
    SELECT s.id, s.product_id, s.quantity_sqft, s.updated_on,
           p.code as product_code, p.description as product_description, p.origin as product_origin, p.category as product_category
    FROM Stock s
    JOIN Product p ON s.product_id = p.id
    ORDER BY p.code ASC
  `
    )
    .all();

  const formatted = rows.map((r: any) => ({
    id: r.id,
    productId: r.product_id,
    productCode: r.product_code,
    productDescription: r.product_description,
    productOrigin: r.product_origin,
    productCategory: r.product_category,
    quantitySqft: r.quantity_sqft ?? 0,
    updatedOn: r.updated_on,
  }));
  res.json(formatted);
});

// --- STOK HAREKETLERI (STOCK MOVEMENTS) ---
app.get('/api/stock-movements', (_req: Request, res: Response) => {
  const rows: any = db
    .prepare(
      `
    SELECT sm.id, sm.product_id, sm.type, sm.quantity_sqft, sm.date,
           p.code as product_code, p.description as product_description, p.origin as product_origin
    FROM StockMovement sm
    LEFT JOIN Product p ON sm.product_id = p.id
    ORDER BY sm.date DESC, sm.id DESC
  `
    )
    .all();

  const formatted = rows.map((r: any) => ({
    id: r.id,
    productId: r.product_id,
    type: r.type,
    quantitySqft: r.quantity_sqft,
    date: r.date,
    productCode: r.product_code,
    productDescription: r.product_description,
    productOrigin: r.product_origin,
    product: r.product_id
      ? {
          id: r.product_id,
          code: r.product_code,
          description: r.product_description,
          origin: r.product_origin,
        }
      : null,
  }));
  res.json(formatted);
});

app.post('/api/stock-movements', (req: Request, res: Response) => {
  const productId = req.body.productId ?? req.body.product_id;
  const type = req.body.type;
  const quantitySqft = req.body.quantitySqft ?? req.body.quantity_sqft;
  const date = req.body.date;

  if (!productId) return res.status(400).json({ error: 'Product is required' });
  if (!type || !['D', 'G', 'F'].includes(type)) {
    return res.status(400).json({ error: 'Valid type (D, G, F) is required' });
  }
  const qty = Number(quantitySqft || 0);
  if (qty <= 0) return res.status(400).json({ error: 'Quantity must be greater than 0' });

  let movementDate: number;
  if (typeof date === 'string' && date.includes('-')) {
    movementDate = new Date(date).getTime() || Date.now();
  } else if (date !== undefined && date !== null) {
    movementDate = Number(date);
  } else {
    movementDate = Date.now();
  }
  const now = Date.now();

  const insertMovement = db.prepare(`
    INSERT INTO StockMovement (product_id, type, quantity_sqft, date)
    VALUES (?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    const info = insertMovement.run(Number(productId), type, qty, movementDate);

    // Sync Stock and Product tables using adjustProductStock helper
    let delta = 0;
    if (type === 'G' || type === 'D') {
      delta = qty;
    } else if (type === 'F') {
      delta = -qty;
    }
    adjustProductStock(Number(productId), delta);

    return info.lastInsertRowid;
  });

  const insertedId = tx();
  res.status(201).json({
    id: insertedId,
    productId: Number(productId),
    type,
    quantitySqft: qty,
    date: movementDate,
  });
});

app.delete('/api/stock-movements/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const row: any = db.prepare('SELECT * FROM StockMovement WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Stock movement not found' });

  const tx = db.transaction(() => {
    // Revert stock adjustment using adjustProductStock
    let reverseDelta = 0;
    if (row.type === 'G' || row.type === 'D') {
      reverseDelta = -row.quantity_sqft;
    } else if (row.type === 'F') {
      reverseDelta = row.quantity_sqft;
    }
    adjustProductStock(Number(row.product_id), reverseDelta);

    db.prepare('DELETE FROM StockMovement WHERE id = ?').run(id);
  });

  tx();
  res.json({ success: true });
});

// --- KASA (CASH REGISTER) ---
app.get('/api/cash-registers', (req: Request, res: Response) => {
  const q = req.query.search as string;
  let rows;
  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    rows = db
      .prepare('SELECT * FROM CashRegister WHERE code LIKE ? OR description LIKE ? ORDER BY id ASC')
      .all(term, term);
  } else {
    rows = db.prepare('SELECT * FROM CashRegister ORDER BY id ASC').all();
  }
  const formatted = rows.map((r: any) => ({
    id: r.id,
    code: r.code,
    description: r.description,
    balance: r.balance,
    updatedOn: r.updated_on,
  }));
  res.json(formatted);
});

app.post('/api/cash-registers', (req: Request, res: Response) => {
  const { code, description, balance, updatedOn } = req.body;
  if (!description) return res.status(400).json({ error: 'Description is required' });
  const stmt = db.prepare(`
    INSERT INTO CashRegister (code, description, balance, updated_on)
    VALUES (?, ?, ?, ?)
  `);
  const now = Date.now();
  const info = stmt.run(
    code ?? null,
    description,
    balance !== undefined && balance !== null ? Number(balance) : 0,
    updatedOn !== undefined && updatedOn !== null ? Number(updatedOn) : now
  );
  res.status(201).json({ id: info.lastInsertRowid, ...req.body });
});

app.put('/api/cash-registers/:id', (req: Request, res: Response) => {
  const { code, description, balance, updatedOn } = req.body;
  const id = req.params.id;
  const stmt = db.prepare(`
    UPDATE CashRegister
    SET code = ?, description = ?, balance = ?, updated_on = ?
    WHERE id = ?
  `);
  const now = Date.now();
  stmt.run(
    code ?? null,
    description,
    balance !== undefined && balance !== null ? Number(balance) : 0,
    updatedOn !== undefined && updatedOn !== null ? Number(updatedOn) : now,
    id
  );
  res.json({ id: Number(id), ...req.body });
});

app.delete('/api/cash-registers/:id', (req: Request, res: Response) => {
  db.prepare('DELETE FROM CashRegister WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- ÇEK VE SENET (CHEQUES & NOTES) ---
app.get('/api/cheques', (req: Request, res: Response) => {
  const q = req.query.search as string;
  let rows: any;
  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    rows = db
      .prepare(
        `
      SELECT 
        c.id, c.document_type, c.portfolio_type, c.document_number, c.due_date, c.amount,
        c.current_account_id, c.status, c.description, c.updated_on,
        a.description as account_description
      FROM ChequeNote c
      LEFT JOIN CurrentAccount a ON c.current_account_id = a.id
      WHERE c.document_number LIKE ? OR c.description LIKE ? OR a.description LIKE ?
      ORDER BY c.id DESC
    `
      )
      .all(term, term, term);
  } else {
    rows = db
      .prepare(
        `
      SELECT 
        c.id, c.document_type, c.portfolio_type, c.document_number, c.due_date, c.amount,
        c.current_account_id, c.status, c.description, c.updated_on,
        a.description as account_description
      FROM ChequeNote c
      LEFT JOIN CurrentAccount a ON c.current_account_id = a.id
      ORDER BY c.id DESC
    `
      )
      .all();
  }

  const formatted = rows.map((r: any) => ({
    id: r.id,
    documentType: r.document_type,
    portfolioType: r.portfolio_type,
    documentNumber: r.document_number,
    dueDate: r.due_date,
    amount: r.amount,
    currentAccountId: r.current_account_id,
    status: r.status,
    description: r.description,
    updatedOn: r.updated_on,
    currentAccount: r.current_account_id
      ? {
          id: r.current_account_id,
          description: r.account_description,
        }
      : null,
  }));
  res.json(formatted);
});

app.post('/api/cheques', (req: Request, res: Response) => {
  const {
    documentType,
    portfolioType,
    documentNumber,
    dueDate,
    amount,
    currentAccountId,
    status,
    description,
    updatedOn,
  } = req.body;

  const stmt = db.prepare(`
    INSERT INTO ChequeNote (document_type, portfolio_type, document_number, due_date, amount, current_account_id, status, description, updated_on)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = Date.now();
  const info = stmt.run(
    documentType ?? 'CEK',
    portfolioType ?? 'ALINAN',
    documentNumber ?? null,
    dueDate !== undefined && dueDate !== null ? Number(dueDate) : now,
    amount !== undefined && amount !== null ? Number(amount) : null,
    currentAccountId !== undefined && currentAccountId !== null ? Number(currentAccountId) : null,
    status ?? 'PORTFOYDE',
    description ?? null,
    updatedOn !== undefined && updatedOn !== null ? Number(updatedOn) : now
  );
  res.status(201).json({ id: info.lastInsertRowid, ...req.body });
});

app.put('/api/cheques/:id', (req: Request, res: Response) => {
  const {
    documentType,
    portfolioType,
    documentNumber,
    dueDate,
    amount,
    currentAccountId,
    status,
    description,
    updatedOn,
  } = req.body;
  const id = req.params.id;

  const stmt = db.prepare(`
    UPDATE ChequeNote
    SET document_type = ?, portfolio_type = ?, document_number = ?, due_date = ?, amount = ?, current_account_id = ?, status = ?, description = ?, updated_on = ?
    WHERE id = ?
  `);
  const now = Date.now();
  stmt.run(
    documentType ?? 'CEK',
    portfolioType ?? 'ALINAN',
    documentNumber ?? null,
    dueDate !== undefined && dueDate !== null ? Number(dueDate) : null,
    amount !== undefined && amount !== null ? Number(amount) : null,
    currentAccountId !== undefined && currentAccountId !== null ? Number(currentAccountId) : null,
    status ?? 'PORTFOYDE',
    description ?? null,
    updatedOn !== undefined && updatedOn !== null ? Number(updatedOn) : now,
    id
  );
  res.json({ id: Number(id), ...req.body });
});

app.delete('/api/cheques/:id', (req: Request, res: Response) => {
  db.prepare('DELETE FROM ChequeNote WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- VITE MIDDLEWARE / STATIC ASSETS ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Lightbase] Full-stack SQLite server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
