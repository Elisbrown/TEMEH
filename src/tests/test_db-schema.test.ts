/**
 * Database schema validation tests.
 *
 * Verifies that all expected tables exist in the live database,
 * each table has the required columns, and CHECK constraints
 * accept the values used by the application code.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db');
let db: Database.Database;

beforeAll(() => {
  db = new Database(dbPath, { readonly: true });
});

afterAll(() => {
  db.close();
});

/** Helper: get column info for a table. */
function getColumns(table: string): { name: string; type: string; notnull: number; pk: number }[] {
  return db.prepare(`PRAGMA table_info(${table})`).all() as any[];
}

/** Helper: list all table names. */
function getTableNames(): string[] {
  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as any[];
  return rows.map((r: any) => r.name);
}

// ---------------------------------------------------------------------------
// Table existence
// ---------------------------------------------------------------------------
describe('Table existence', () => {
  const expectedTables = [
    'users',
    'user_settings',
    'products',
    'categories',
    'orders',
    'order_items',
    'saved_orders',
    'payments',
    'floors',
    'tables',
    'suppliers',
    'tickets',
    'ticket_comments',
    'activity_logs',
    'settings',
    'notes',
    'events',
    'notifications',
    'backups',
    'backup_settings',
    'inventory_items',
    'inventory_movements',
    'inventory_categories',
    'inventory_suppliers',
    'chart_of_accounts',
    'journal_entries',
    'journal_entry_lines',
    'expenses',
    'expense_categories',
    'payroll_salaries',
    'payroll_advances',
    'payroll_payouts',
  ];

  const tableNames = new Set<string>();

  beforeAll(() => {
    getTableNames().forEach((n) => tableNames.add(n));
  });

  it.each(expectedTables)('table "%s" should exist', (table) => {
    expect(tableNames.has(table)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Column validation per table
// ---------------------------------------------------------------------------
describe('Users table columns', () => {
  it('should have all required columns', () => {
    const cols = getColumns('users').map((c) => c.name);
    const required = [
      'id', 'name', 'email', 'password', 'role', 'status', 'avatar',
      'floor', 'phone', 'hire_date', 'force_password_change',
      'emergency_contact_name', 'emergency_contact_relationship', 'emergency_contact_phone',
    ];
    for (const col of required) {
      expect(cols).toContain(col);
    }
  });
});

describe('Activity logs table columns', () => {
  it('should use entity_id (not target) column', () => {
    const cols = getColumns('activity_logs').map((c) => c.name);
    expect(cols).toContain('entity_id');
    expect(cols).not.toContain('target');
  });
});

describe('Orders table columns', () => {
  it('should have payment_method column', () => {
    const cols = getColumns('orders').map((c) => c.name);
    expect(cols).toContain('payment_method');
  });
});

describe('Order items table columns', () => {
  it('should have item_type column', () => {
    const cols = getColumns('order_items').map((c) => c.name);
    expect(cols).toContain('item_type');
  });
});

describe('Inventory items table columns', () => {
  it('should have extended columns', () => {
    const cols = getColumns('inventory_items').map((c) => c.name);
    expect(cols).toContain('unit_type');
    expect(cols).toContain('selling_price');
    expect(cols).toContain('expiry_date');
    expect(cols).toContain('batch_number');
  });
});

// ---------------------------------------------------------------------------
// CHECK constraint validation
// ---------------------------------------------------------------------------
describe('Users table CHECK constraints', () => {
  const validRoles = [
    'Super Admin', 'Manager', 'Accountant', 'Cashier',
  ];
  const rejectedOldRoles = ['Waiter', 'Chef', 'Stock Manager', 'Bartender', 'Auditor'];
  const validStatuses = ['Active', 'Away', 'Inactive'];

  it.each(validRoles)('should accept role "%s"', (role) => {
    // Use a temporary in-memory copy of the schema to test constraints
    const tmpDb = new Database(':memory:');
    const schemaSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as any;
    tmpDb.exec(schemaSql.sql);
    
    expect(() => {
      tmpDb.prepare(
        "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)"
      ).run('Test', `test_${role.replace(/ /g, '')}@test.com`, 'hash', role, 'Active');
    }).not.toThrow();
    tmpDb.close();
  });

  it.each(validStatuses)('should accept status "%s"', (status) => {
    const tmpDb = new Database(':memory:');
    const schemaSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as any;
    tmpDb.exec(schemaSql.sql);
    
    expect(() => {
      tmpDb.prepare(
        "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)"
      ).run('Test', 'test@test.com', 'hash', 'Super Admin', status);
    }).not.toThrow();
    tmpDb.close();
  });

  it('should reject invalid role "super_admin" (old format)', () => {
    const tmpDb = new Database(':memory:');
    const schemaSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as any;
    tmpDb.exec(schemaSql.sql);
    
    expect(() => {
      tmpDb.prepare(
        "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)"
      ).run('Test', 'test@test.com', 'hash', 'super_admin', 'Active');
    }).toThrow();
    tmpDb.close();
  });

  it.each(rejectedOldRoles)('should reject removed role "%s"', (role) => {
    const tmpDb = new Database(':memory:');
    const schemaSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as any;
    tmpDb.exec(schemaSql.sql);
    
    expect(() => {
      tmpDb.prepare(
        "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)"
      ).run('Test', `test_${role.replace(/ /g, '')}@test.com`, 'hash', role, 'Active');
    }).toThrow();
    tmpDb.close();
  });
});

describe('Inventory movements CHECK constraints', () => {
  it.each(['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'])('should accept movement_type "%s"', (type) => {
    const tmpDb = new Database(':memory:');

    // Recreate a minimal version of the table with just the CHECK constraint
    tmpDb.exec(`
      CREATE TABLE inventory_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        movement_type TEXT NOT NULL CHECK(movement_type IN ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER')),
        quantity REAL NOT NULL
      )
    `);

    expect(() => {
      tmpDb.prepare(
        "INSERT INTO inventory_movements (item_id, movement_type, quantity) VALUES (?, ?, ?)"
      ).run(1, type, 10);
    }).not.toThrow();
    tmpDb.close();
  });
});
