// src/lib/db/expenses.ts
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db');
let dbInstance: Database.Database | null = null;

function getDb(): Database.Database {
    if (dbInstance && dbInstance.open) {
        return dbInstance;
    }

    const db = new Database(dbPath);

    // Create expenses table if it doesn't exist
    db.exec(`
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date DATE NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT,
            payment_method TEXT,
            receipt_number TEXT,
            vendor TEXT,
            user_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS expense_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            color TEXT DEFAULT '#6b7280',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Insert default expense categories if empty
        INSERT OR IGNORE INTO expense_categories (name, description, color) VALUES
            ('Transport', 'Delivery and transportation costs', '#3b82f6'),
            ('Fuel', 'Fuel for vehicles and generators', '#f59e0b'),
            ('Maintenance', 'Equipment and facility maintenance', '#10b981'),
            ('Utilities', 'Electricity, water, and other utilities', '#8b5cf6'),
            ('Supplies', 'Office and shop supplies', '#ec4899'),
            ('Miscellaneous', 'Other expenses', '#6b7280');
    `);

    dbInstance = db;
    return db;
}

export type Expense = {
    id: number;
    date: string;
    category: string;
    amount: number;
    description?: string;
    payment_method?: string;
    receipt_number?: string;
    vendor?: string;
    user_id?: number;
    created_at: string;
    updated_at: string;
    user?: {
        name: string;
        email: string;
    };
};

export type ExpenseCategory = {
    id: number;
    name: string;
    description?: string;
    color: string;
    created_at: string;
};

// Expenses CRUD
export async function getExpenses(startDate?: string, endDate?: string): Promise<Expense[]> {
    const db = getDb();
    let query = `
        SELECT e.*, u.name as user_name, u.email as user_email
        FROM expenses e
        LEFT JOIN users u ON e.user_id = u.id
    `;
    
    const params: string[] = [];
    if (startDate && endDate) {
        query += ' WHERE DATE(e.date) >= DATE(?) AND DATE(e.date) <= DATE(?)';
        params.push(startDate, endDate);
    }
    
    query += ' ORDER BY e.date DESC, e.created_at DESC';
    
    const rows = db.prepare(query).all(...params) as any[];

    return rows.map(row => ({
        ...row,
        user: row.user_name ? { name: row.user_name, email: row.user_email } : undefined
    }));
}

export async function getExpenseById(id: number): Promise<Expense | null> {
    const db = getDb();
    const row = db.prepare(`
        SELECT e.*, u.name as user_name, u.email as user_email
        FROM expenses e
        LEFT JOIN users u ON e.user_id = u.id
        WHERE e.id = ?
    `).get(id) as any;

    if (!row) return null;

    return {
        ...row,
        user: row.user_name ? { name: row.user_name, email: row.user_email } : undefined
    };
}

export async function addExpense(data: Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'user'>): Promise<Expense> {
    const db = getDb();
    const stmt = db.prepare(`
        INSERT INTO expenses (date, category, amount, description, payment_method, receipt_number, vendor, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
        data.date, data.category, data.amount, data.description || null,
        data.payment_method || null, data.receipt_number || null, data.vendor || null, data.user_id || null
    );
    
    return await getExpenseById(result.lastInsertRowid as number) as Expense;
}

export async function updateExpense(id: number, data: Partial<Expense>): Promise<Expense> {
    const db = getDb();
    const fields = Object.keys(data).filter(key => 
        key !== 'id' && key !== 'created_at' && key !== 'updated_at' && key !== 'user'
    );
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => (data as any)[field]);
    
    const stmt = db.prepare(`UPDATE expenses SET ${setClause}, updated_at = ? WHERE id = ?`);
    stmt.run(...values, new Date().toISOString(), id);
    
    return await getExpenseById(id) as Expense;
}

export async function deleteExpense(id: number): Promise<void> {
    const db = getDb();
    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
}

// Categories CRUD
export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
    const db = getDb();
    return db.prepare('SELECT * FROM expense_categories ORDER BY name').all() as ExpenseCategory[];
}

export async function addExpenseCategory(data: Omit<ExpenseCategory, 'id' | 'created_at'>): Promise<ExpenseCategory> {
    const db = getDb();
    const stmt = db.prepare('INSERT INTO expense_categories (name, description, color) VALUES (?, ?, ?)');
    const result = stmt.run(data.name, data.description || null, data.color);
    
    return {
        id: result.lastInsertRowid as number,
        ...data,
        created_at: new Date().toISOString()
    };
}

// Stats
export async function getExpenseStats(startDate?: string, endDate?: string): Promise<{
    totalExpenses: number;
    expensesByCategory: { category: string; total: number }[];
    dailyAverage: number;
    count: number;
}> {
    const db = getDb();
    
    let dateFilter = '';
    const params: string[] = [];
    if (startDate && endDate) {
        dateFilter = ' WHERE DATE(date) >= DATE(?) AND DATE(date) <= DATE(?)';
        params.push(startDate, endDate);
    }
    
    const totalResult = db.prepare(`SELECT SUM(amount) as total, COUNT(*) as count FROM expenses${dateFilter}`).get(...params) as any;
    const categoryResult = db.prepare(`SELECT category, SUM(amount) as total FROM expenses${dateFilter} GROUP BY category ORDER BY total DESC`).all(...params) as any[];
    
    // Calculate daily average
    let dailyAverage = 0;
    if (startDate && endDate && totalResult?.total) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        dailyAverage = totalResult.total / days;
    }
    
    return {
        totalExpenses: totalResult?.total || 0,
        expensesByCategory: categoryResult.map(r => ({ category: r.category, total: r.total })),
        dailyAverage,
        count: totalResult?.count || 0
    };
}

// Alias for API route compatibility
export const createExpense = addExpense;

