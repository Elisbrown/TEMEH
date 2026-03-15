/**
 * Migration script to fix the `users` table CHECK constraints.
 *
 * Problem: The live DB has role IN ('super_admin','admin','staff') and
 *          status IN ('active','inactive'), but the application code
 *          uses 'Super Admin', 'Manager', etc. and 'Active', 'Away', 'Inactive'.
 *
 * Solution: Recreate the table with the correct CHECK constraints
 *           and migrate existing data.
 *
 * Usage: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/migrate-users-table.ts
 */

import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db');

function migrate() {
  const db = new Database(dbPath);

  console.log('Starting users table migration...');
  console.log(`Database: ${dbPath}`);

  // Check current state
  const currentUsers = db.prepare('SELECT * FROM users').all() as any[];
  console.log(`Found ${currentUsers.length} existing user(s).`);

  db.exec('BEGIN TRANSACTION');

  try {
    // 1. Rename the old table
    db.exec('ALTER TABLE users RENAME TO users_old');

    // 2. Create the new table with correct constraints
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN (
          'Super Admin', 'Manager', 'Accountant', 'Stock Manager',
          'Chef', 'Waiter', 'Cashier', 'Bartender', 'Auditor'
        )),
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

    // 3. Map old role/status values to new ones during migration
    const roleMap: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Manager',
      staff: 'Waiter',
    };
    const statusMap: Record<string, string> = {
      active: 'Active',
      inactive: 'Inactive',
    };

    if (currentUsers.length > 0) {
      const insertStmt = db.prepare(`
        INSERT INTO users (
          id, name, email, password, role, status, avatar, floor, phone,
          hire_date, force_password_change, emergency_contact_name,
          emergency_contact_relationship, emergency_contact_phone,
          created_at, updated_at
        ) VALUES (
          @id, @name, @email, @password, @role, @status, @avatar, @floor, @phone,
          @hire_date, @force_password_change, @emergency_contact_name,
          @emergency_contact_relationship, @emergency_contact_phone,
          @created_at, @updated_at
        )
      `);

      for (const user of currentUsers) {
        const mappedRole = roleMap[user.role] || user.role;
        const mappedStatus = statusMap[user.status] || user.status;

        insertStmt.run({
          id: user.id,
          name: user.name,
          email: user.email,
          password: user.password,
          role: mappedRole,
          status: mappedStatus,
          avatar: user.avatar,
          floor: user.floor,
          phone: user.phone,
          hire_date: user.hire_date,
          force_password_change: user.force_password_change ?? 1,
          emergency_contact_name: user.emergency_contact_name,
          emergency_contact_relationship: user.emergency_contact_relationship,
          emergency_contact_phone: user.emergency_contact_phone,
          created_at: user.created_at,
          updated_at: user.updated_at,
        });
        console.log(`  Migrated user: ${user.email} (${user.role} -> ${mappedRole}, ${user.status} -> ${mappedStatus})`);
      }
    }

    // 4. Drop the old table
    db.exec('DROP TABLE users_old');

    db.exec('COMMIT');
    console.log('\nMigration completed successfully!');

    // Verify
    const newUsers = db.prepare('SELECT id, name, email, role, status FROM users').all();
    console.log('\nCurrent users after migration:');
    console.table(newUsers);
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('Migration failed, rolled back:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

migrate();
