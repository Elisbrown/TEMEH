// src/lib/db/payroll.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db');
let dbInstance: Database.Database | null = null;

function getDb(): Database.Database {
    if (dbInstance && dbInstance.open) {
        return dbInstance;
    }

    const db = new Database(dbPath);

    // Create payroll tables if they don't exist
    db.exec(`
        CREATE TABLE IF NOT EXISTS payroll_advances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            reason TEXT,
            date DATE NOT NULL,
            approved_by INTEGER,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'repaid')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES users(id),
            FOREIGN KEY (approved_by) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS payroll_salaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            base_salary REAL NOT NULL,
            effective_date DATE NOT NULL,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS payroll_payouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            deductions REAL DEFAULT 0,
            bonuses REAL DEFAULT 0,
            net_amount REAL NOT NULL,
            payment_method TEXT,
            payment_date DATE NOT NULL,
            notes TEXT,
            processed_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES users(id),
            FOREIGN KEY (processed_by) REFERENCES users(id)
        );
    `);

    dbInstance = db;
    return db;
}

export type PayrollAdvance = {
    id: number;
    employee_id: number;
    amount: number;
    reason?: string;
    date: string;
    approved_by?: number;
    status: 'pending' | 'approved' | 'rejected' | 'repaid';
    created_at: string;
    employee?: {
        name: string;
        email: string;
    };
    approver?: {
        name: string;
    };
};

export type PayrollSalary = {
    id: number;
    employee_id: number;
    base_salary: number;
    effective_date: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    employee?: {
        name: string;
        email: string;
    };
};

export type PayrollPayout = {
    id: number;
    employee_id: number;
    amount: number;
    period_start: string;
    period_end: string;
    deductions: number;
    bonuses: number;
    net_amount: number;
    payment_method?: string;
    payment_date: string;
    notes?: string;
    processed_by?: number;
    created_at: string;
    employee?: {
        name: string;
        email: string;
    };
};

// Advances CRUD
export async function getAdvances(): Promise<PayrollAdvance[]> {
    const db = getDb();
    const rows = db.prepare(`
        SELECT a.*, 
            u.name as employee_name, u.email as employee_email,
            ap.name as approver_name
        FROM payroll_advances a
        LEFT JOIN users u ON a.employee_id = u.id
        LEFT JOIN users ap ON a.approved_by = ap.id
        ORDER BY a.date DESC
    `).all() as any[];

    return rows.map(row => ({
        ...row,
        employee: { name: row.employee_name, email: row.employee_email },
        approver: row.approver_name ? { name: row.approver_name } : undefined
    }));
}

export async function addAdvance(data: Omit<PayrollAdvance, 'id' | 'created_at' | 'employee' | 'approver'>): Promise<PayrollAdvance> {
    const db = getDb();
    const stmt = db.prepare(`
        INSERT INTO payroll_advances (employee_id, amount, reason, date, approved_by, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(data.employee_id, data.amount, data.reason || null, data.date, data.approved_by || null, data.status);
    
    const advances = await getAdvances();
    return advances.find(a => a.id === result.lastInsertRowid) as PayrollAdvance;
}

export async function updateAdvanceStatus(id: number, status: PayrollAdvance['status'], approvedBy?: number): Promise<void> {
    const db = getDb();
    const stmt = db.prepare('UPDATE payroll_advances SET status = ?, approved_by = ? WHERE id = ?');
    stmt.run(status, approvedBy || null, id);
}

export async function updateAdvance(id: number, data: Partial<Omit<PayrollAdvance, 'id' | 'created_at' | 'employee' | 'approver'>>): Promise<void> {
    const db = getDb();
    const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = Object.values(data);
    const stmt = db.prepare(`UPDATE payroll_advances SET ${fields} WHERE id = ?`);
    stmt.run(...values, id);
}

export async function deleteAdvance(id: number): Promise<void> {
    const db = getDb();
    db.prepare('DELETE FROM payroll_advances WHERE id = ?').run(id);
}

// Salaries CRUD
export async function getSalaries(): Promise<PayrollSalary[]> {
    const db = getDb();
    const rows = db.prepare(`
        SELECT s.*, u.name as employee_name, u.email as employee_email
        FROM payroll_salaries s
        LEFT JOIN users u ON s.employee_id = u.id
        ORDER BY s.effective_date DESC
    `).all() as any[];

    return rows.map(row => ({
        ...row,
        employee: { name: row.employee_name, email: row.employee_email }
    }));
}

export async function addSalary(data: Omit<PayrollSalary, 'id' | 'created_at' | 'updated_at' | 'employee'>): Promise<PayrollSalary> {
    const db = getDb();
    const stmt = db.prepare(`
        INSERT INTO payroll_salaries (employee_id, base_salary, effective_date, notes)
        VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(data.employee_id, data.base_salary, data.effective_date, data.notes || null);
    
    const salaries = await getSalaries();
    return salaries.find(s => s.id === result.lastInsertRowid) as PayrollSalary;
}

export async function updateSalary(id: number, data: Partial<Omit<PayrollSalary, 'id' | 'created_at' | 'updated_at' | 'employee'>>): Promise<void> {
    const db = getDb();
    const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = Object.values(data);
    const stmt = db.prepare(`UPDATE payroll_salaries SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
    stmt.run(...values, id);
}

export async function deleteSalary(id: number): Promise<void> {
    const db = getDb();
    db.prepare('DELETE FROM payroll_salaries WHERE id = ?').run(id);
}

// Payouts CRUD
export async function getPayouts(): Promise<PayrollPayout[]> {
    const db = getDb();
    const rows = db.prepare(`
        SELECT p.*, u.name as employee_name, u.email as employee_email
        FROM payroll_payouts p
        LEFT JOIN users u ON p.employee_id = u.id
        ORDER BY p.payment_date DESC
    `).all() as any[];

    return rows.map(row => ({
        ...row,
        employee: { name: row.employee_name, email: row.employee_email }
    }));
}

export async function addPayout(data: Omit<PayrollPayout, 'id' | 'created_at' | 'employee'>): Promise<PayrollPayout> {
    const db = getDb();
    const stmt = db.prepare(`
        INSERT INTO payroll_payouts (employee_id, amount, period_start, period_end, deductions, bonuses, net_amount, payment_method, payment_date, notes, processed_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
        data.employee_id, data.amount, data.period_start, data.period_end,
        data.deductions, data.bonuses, data.net_amount, data.payment_method || null,
        data.payment_date, data.notes || null, data.processed_by || null
    );
    
    const payouts = await getPayouts();
    return payouts.find(p => p.id === result.lastInsertRowid) as PayrollPayout;
}

export async function updatePayout(id: number, data: Partial<Omit<PayrollPayout, 'id' | 'created_at' | 'employee'>>): Promise<void> {
    const db = getDb();
    const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = Object.values(data);
    const stmt = db.prepare(`UPDATE payroll_payouts SET ${fields} WHERE id = ?`);
    stmt.run(...values, id);
}

export async function deletePayout(id: number): Promise<void> {
    const db = getDb();
    db.prepare('DELETE FROM payroll_payouts WHERE id = ?').run(id);
}

// Summary stats
export async function getPayrollStats(employeeId?: number): Promise<{
    totalAdvances: number;
    pendingAdvances: number;
    totalPayouts: number;
    lastPayout?: string;
}> {
    const db = getDb();
    
    let advanceQuery = 'SELECT SUM(amount) as total, SUM(CASE WHEN status = "pending" THEN amount ELSE 0 END) as pending FROM payroll_advances';
    let payoutQuery = 'SELECT SUM(net_amount) as total, MAX(payment_date) as last FROM payroll_payouts';
    
    if (employeeId) {
        advanceQuery += ` WHERE employee_id = ${employeeId}`;
        payoutQuery += ` WHERE employee_id = ${employeeId}`;
    }
    
    const advanceStats = db.prepare(advanceQuery).get() as any;
    const payoutStats = db.prepare(payoutQuery).get() as any;
    
    return {
        totalAdvances: advanceStats?.total || 0,
        pendingAdvances: advanceStats?.pending || 0,
        totalPayouts: payoutStats?.total || 0,
        lastPayout: payoutStats?.last
    };
}

// Aliases for API route compatibility
export const createAdvance = addAdvance;
export const setSalary = addSalary;
export const createPayout = addPayout;
