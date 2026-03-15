import Database from 'better-sqlite3';
import path from 'path';

interface JournalEntry {
  id: number;
  entry_date: string;
  entry_type: string;
  description: string;
  reference: string;
  total_amount: number;
  status: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

interface JournalEntryLine {
  id: number;
  journal_entry_id: number;
  account_code: string;
  account_name: string;
  description: string;
  debit: number;
  credit: number;
}

interface ChartOfAccount {
  id: number;
  code: string;
  name: string;
  account_type: string;
  parent_code: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function getDb(): Database.Database {
  const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db');
  return new Database(dbPath);
}

export function initAccountingTables() {
  const db = getDb();
  try {
    // Journal Entries table
    db.exec(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_date DATE NOT NULL,
        entry_type TEXT NOT NULL,
        description TEXT,
        reference TEXT,
        total_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'draft',
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Journal Entry Lines table
    db.exec(`
      CREATE TABLE IF NOT EXISTS journal_entry_lines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        journal_entry_id INTEGER NOT NULL,
        account_code TEXT NOT NULL,
        account_name TEXT NOT NULL,
        description TEXT,
        debit REAL DEFAULT 0,
        credit REAL DEFAULT 0,
        FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE
      )
    `);

    // Chart of Accounts table
    db.exec(`
      CREATE TABLE IF NOT EXISTS chart_of_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        account_type TEXT NOT NULL,
        parent_code TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default chart of accounts if empty
    const count = db.prepare('SELECT COUNT(*) as count FROM chart_of_accounts').get() as { count: number };
    if (count.count === 0) {
      seedChartOfAccounts(db);
    }
  } finally {
    db.close();
  }
}

function seedChartOfAccounts(db: Database.Database) {
  const accounts = [
    // Assets
    { code: '1000', name: 'Cash', type: 'asset' },
    { code: '1100', name: 'Accounts Receivable', type: 'asset' },
    { code: '1200', name: 'Inventory', type: 'asset' },
    { code: '1300', name: 'Prepaid Expenses', type: 'asset' },
    { code: '1400', name: 'Equipment', type: 'asset' },
    { code: '1500', name: 'Accumulated Depreciation', type: 'asset' },

    // Liabilities
    { code: '2000', name: 'Accounts Payable', type: 'liability' },
    { code: '2100', name: 'Accrued Expenses', type: 'liability' },
    { code: '2200', name: 'Loans Payable', type: 'liability' },
    { code: '2300', name: 'Taxes Payable', type: 'liability' },

    // Equity
    { code: '3000', name: "Owner's Equity", type: 'equity' },
    { code: '3100', name: 'Retained Earnings', type: 'equity' },
    { code: '3900', name: 'Current Year Earnings', type: 'equity' },

    // Revenue
    { code: '4000', name: 'Sales Revenue', type: 'revenue' },
    { code: '4100', name: 'Service Revenue', type: 'revenue' },
    { code: '4200', name: 'Other Revenue', type: 'revenue' },

    // Expenses
    { code: '5000', name: 'Cost of Goods Sold', type: 'expense' },
    { code: '5100', name: 'Salaries & Wages', type: 'expense' },
    { code: '5200', name: 'Rent Expense', type: 'expense' },
    { code: '5300', name: 'Utilities', type: 'expense' },
    { code: '5400', name: 'Supplies', type: 'expense' },
    { code: '5500', name: 'Depreciation', type: 'expense' },
    { code: '5600', name: 'Marketing & Advertising', type: 'expense' },
    { code: '5900', name: 'Miscellaneous Expenses', type: 'expense' },
  ];

  const stmt = db.prepare(`
    INSERT INTO chart_of_accounts (code, name, account_type)
    VALUES (?, ?, ?)
  `);

  for (const account of accounts) {
    stmt.run(account.code, account.name, account.type);
  }
}

// Chart of Accounts functions
export function getChartOfAccounts(): ChartOfAccount[] {
  const db = getDb();
  try {
    initAccountingTables();
    const stmt = db.prepare('SELECT * FROM chart_of_accounts WHERE is_active = 1 ORDER BY code');
    return stmt.all() as ChartOfAccount[];
  } finally {
    db.close();
  }
}

export function getAccountByCode(code: string): ChartOfAccount | null {
  const db = getDb();
  try {
    const stmt = db.prepare('SELECT * FROM chart_of_accounts WHERE code = ?');
    return stmt.get(code) as ChartOfAccount | null;
  } finally {
    db.close();
  }
}

export function addChartOfAccount(accountData: Omit<ChartOfAccount, 'id' | 'created_at' | 'updated_at' | 'is_active'>): ChartOfAccount {
  const db = getDb();
  try {
    const stmt = db.prepare(`
      INSERT INTO chart_of_accounts (code, name, account_type, parent_code)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      accountData.code,
      accountData.name,
      accountData.account_type,
      accountData.parent_code || null
    );

    return {
      id: Number(result.lastInsertRowid),
      code: accountData.code,
      name: accountData.name,
      account_type: accountData.account_type,
      parent_code: accountData.parent_code || null,
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  } finally {
    db.close();
  }
}

// Journal Entry functions
export function getJournalEntries(filters?: { type?: string; status?: string; startDate?: string; endDate?: string; reference?: string }): JournalEntry[] {
  const db = getDb();
  try {
    initAccountingTables();
    let query = 'SELECT * FROM journal_entries WHERE 1=1';
    const params: any[] = [];

    if (filters?.type) {
      query += ' AND entry_type = ?';
      params.push(filters.type);
    }
    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.reference) {
      query += ' AND reference = ?';
      params.push(filters.reference);
    }
    if (filters?.startDate) {
      query += ' AND entry_date >= ?';
      params.push(filters.startDate);
    }
    if (filters?.endDate) {
      query += ' AND entry_date <= ?';
      params.push(filters.endDate);
    }

    query += ' ORDER BY entry_date DESC, id DESC';

    const stmt = db.prepare(query);
    return stmt.all(...params) as JournalEntry[];
  } finally {
    db.close();
  }
}

export function getJournalEntryById(id: number): (JournalEntry & { lines: JournalEntryLine[] }) | null {
  const db = getDb();
  try {
    const entryStmt = db.prepare('SELECT * FROM journal_entries WHERE id = ?');
    const entry = entryStmt.get(id) as JournalEntry | null;

    if (!entry) return null;

    const linesStmt = db.prepare('SELECT * FROM journal_entry_lines WHERE journal_entry_id = ?');
    const lines = linesStmt.all(id) as JournalEntryLine[];

    return { ...entry, lines };
  } finally {
    db.close();
  }
}

export function createJournalEntry(data: {
  entry_date: string;
  entry_type: string;
  description: string;
  reference?: string;
  lines: Array<{ account_code: string; account_name: string; description?: string; debit: number; credit: number }>;
  created_by?: number;
}): JournalEntry & { lines: JournalEntryLine[] } {
  const db = getDb();
  try {
    initAccountingTables();

    // Calculate total amount
    const totalAmount = data.lines.reduce((sum, line) => sum + Math.max(line.debit, line.credit), 0);

    // Validate debits = credits
    const totalDebits = data.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredits = data.lines.reduce((sum, line) => sum + line.credit, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error('Debits must equal credits');
    }

    // Insert journal entry
    const entryStmt = db.prepare(`
      INSERT INTO journal_entries (entry_date, entry_type, description, reference, total_amount, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = entryStmt.run(
      data.entry_date,
      data.entry_type,
      data.description,
      data.reference || '',
      totalAmount,
      data.created_by || 1
    );

    const entryId = Number(result.lastInsertRowid);

    // Insert journal entry lines
    const lineStmt = db.prepare(`
      INSERT INTO journal_entry_lines (journal_entry_id, account_code, account_name, description, debit, credit)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const line of data.lines) {
      lineStmt.run(
        entryId,
        line.account_code,
        line.account_name,
        line.description || '',
        line.debit,
        line.credit
      );
    }

    return getJournalEntryById(entryId)!;
  } finally {
    db.close();
  }
}

export function updateJournalEntry(id: number, data: Partial<{
  entry_date: string;
  description: string;
  reference: string;
  status: string;
}>): JournalEntry | null {
  const db = getDb();
  try {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.entry_date !== undefined) {
      updates.push('entry_date = ?');
      values.push(data.entry_date);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.reference !== undefined) {
      updates.push('reference = ?');
      values.push(data.reference);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`
      UPDATE journal_entries
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    const selectStmt = db.prepare('SELECT * FROM journal_entries WHERE id = ?');
    return selectStmt.get(id) as JournalEntry | null;
  } finally {
    db.close();
  }
}

export function deleteJournalEntry(id: number): boolean {
  const db = getDb();
  try {
    // Delete lines first (cascade should handle this, but being explicit)
    const deleteLinesStmt = db.prepare('DELETE FROM journal_entry_lines WHERE journal_entry_id = ?');
    deleteLinesStmt.run(id);

    // Delete entry
    const deleteEntryStmt = db.prepare('DELETE FROM journal_entries WHERE id = ?');
    const result = deleteEntryStmt.run(id);

    return result.changes > 0;
  } finally {
    db.close();
  }
}
