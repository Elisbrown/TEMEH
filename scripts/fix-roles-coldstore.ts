/**
 * Migration: Coldstore role restriction & waiter_id → cashier_id rename.
 *
 * 1. Updates `users` CHECK constraint to only allow 4 roles.
 * 2. Maps existing users with old roles to new roles.
 * 3. Renames `waiter_id` → `cashier_id` in the `orders` table.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/fix-roles-coldstore.ts
 */

import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db');

/** Map old roles to new coldstore roles. */
const ROLE_MAP: Record<string, string> = {
  'Auditor': 'Accountant',
  'Stock Manager': 'Manager',
  'Chef': 'Cashier',
  'Waiter': 'Cashier',
  'Bartender': 'Cashier',
};

const NEW_ROLES = ['Super Admin', 'Manager', 'Accountant', 'Cashier'];

function migrate() {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = OFF');

  console.log('=== Coldstore Migration ===\n');

  db.exec('BEGIN TRANSACTION');
  try {
    // ---------------------------------------------------------------
    // Step 1: Map old role values in the data
    // ---------------------------------------------------------------
    console.log('Step 1: Mapping old role values…');
    for (const [oldRole, newRole] of Object.entries(ROLE_MAP)) {
      const result = db.prepare('UPDATE users SET role = ? WHERE role = ?').run(newRole, oldRole);
      if (result.changes > 0) {
        console.log(`  ${oldRole} → ${newRole}: ${result.changes} user(s)`);
      }
    }

    // ---------------------------------------------------------------
    // Step 2: Recreate users table with 4-role CHECK constraint
    // ---------------------------------------------------------------
    console.log('\nStep 2: Updating users table CHECK constraint…');
    const usersRows = db.prepare('SELECT * FROM users').all() as Record<string, unknown>[];
    db.exec('ALTER TABLE users RENAME TO __tmp_users');
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('Super Admin', 'Manager', 'Accountant', 'Cashier')),
        status TEXT DEFAULT 'Active' CHECK(status IN ('Active', 'Away', 'Inactive')),
        avatar TEXT,
        floor TEXT,
        phone TEXT,
        hire_date DATE,
        force_password_change INTEGER DEFAULT 1,
        emergency_contact_name TEXT,
        emergency_contact_relationship TEXT,
        emergency_contact_phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    if (usersRows.length > 0) {
      const cols = Object.keys(usersRows[0]);
      const ph = cols.map(() => '?').join(', ');
      const ins = db.prepare(`INSERT INTO users (${cols.join(', ')}) VALUES (${ph})`);
      for (const row of usersRows) {
        ins.run(...cols.map(c => row[c]));
      }
    }
    db.exec('DROP TABLE __tmp_users');
    console.log(`  ✅ ${usersRows.length} user(s) migrated`);

    // ---------------------------------------------------------------
    // Step 3: Rename waiter_id → cashier_id in orders table
    // ---------------------------------------------------------------
    console.log('\nStep 3: Renaming waiter_id → cashier_id in orders…');
    const ordersRows = db.prepare('SELECT * FROM orders').all() as Record<string, unknown>[];
    db.exec('ALTER TABLE orders RENAME TO __tmp_orders');
    db.exec(`
      CREATE TABLE orders (
        id TEXT PRIMARY KEY,
        table_name TEXT,
        status TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        subtotal REAL NOT NULL,
        discount REAL DEFAULT 0,
        discount_name TEXT,
        tax REAL DEFAULT 0,
        total REAL NOT NULL,
        cashier_id INTEGER,
        cancelled_by INTEGER,
        cancellation_reason TEXT,
        cancelled_at DATETIME,
        payment_method TEXT,
        FOREIGN KEY (cashier_id) REFERENCES users(id)
      )
    `);
    if (ordersRows.length > 0) {
      const ins = db.prepare(`
        INSERT INTO orders (id, table_name, status, timestamp, subtotal, discount,
          discount_name, tax, total, cashier_id, cancelled_by, cancellation_reason,
          cancelled_at, payment_method)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const row of ordersRows) {
        ins.run(
          row.id, row.table_name, row.status, row.timestamp, row.subtotal,
          row.discount, row.discount_name, row.tax, row.total,
          row.waiter_id, row.cancelled_by, row.cancellation_reason,
          row.cancelled_at, row.payment_method
        );
      }
    }
    db.exec('DROP TABLE __tmp_orders');
    console.log(`  ✅ ${ordersRows.length} order(s) migrated`);

    // ---------------------------------------------------------------
    // Step 4: Fix FK references in payments (orders_old leftover)
    // ---------------------------------------------------------------
    const paymentsFK = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='payments'").get() as any;
    if (paymentsFK?.sql?.includes('orders')) {
      console.log('\nStep 4: Updating payments FK to reference new orders table…');
      const payRows = db.prepare('SELECT * FROM payments').all() as Record<string, unknown>[];
      db.exec('ALTER TABLE payments RENAME TO __tmp_payments');
      db.exec(`
        CREATE TABLE payments (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL,
          amount REAL NOT NULL,
          payment_method TEXT NOT NULL,
          timestamp DATETIME NOT NULL,
          cashier_id INTEGER NOT NULL,
          FOREIGN KEY (order_id) REFERENCES orders(id),
          FOREIGN KEY (cashier_id) REFERENCES users(id)
        )
      `);
      if (payRows.length > 0) {
        const cols = Object.keys(payRows[0]);
        const ph = cols.map(() => '?').join(', ');
        const ins = db.prepare(`INSERT INTO payments (${cols.join(', ')}) VALUES (${ph})`);
        for (const row of payRows) {
          ins.run(...cols.map(c => row[c]));
        }
      }
      db.exec('DROP TABLE __tmp_payments');
      console.log(`  ✅ payments table updated`);
    }

    db.exec('COMMIT');
    console.log('\n=== Migration complete! ===');

    // Verify
    const roles = db.prepare("SELECT DISTINCT role FROM users").all() as any[];
    console.log('Current roles in DB:', roles.map((r: any) => r.role));
    const orderCols = db.prepare("PRAGMA table_info(orders)").all() as any[];
    const hasCashierId = orderCols.some((c: any) => c.name === 'cashier_id');
    const hasWaiterId = orderCols.some((c: any) => c.name === 'waiter_id');
    console.log(`orders.cashier_id: ${hasCashierId ? '✅' : '❌'}, orders.waiter_id: ${hasWaiterId ? '❌ (removed)' : '✅ (gone)'}`);

  } catch (error) {
    db.exec('ROLLBACK');
    console.error('Migration failed, rolled back:', error);
    process.exit(1);
  } finally {
    db.pragma('foreign_keys = ON');
    db.close();
  }
}

migrate();
