/**
 * Migration script to fix FK references pointing to "users_old" and "orders_old".
 *
 * A prior users-table migration left 12 tables with stale FOREIGN KEY
 * references.  SQLite does not support ALTER TABLE … ALTER COLUMN, so we
 * recreate each affected table with correct references.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/fix-fk-references.ts
 */

import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db');

function migrate() {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = OFF'); // Must be OFF during migration

  console.log('Fixing FK references to users_old / orders_old …');

  // Collect all affected tables
  const affected = (db
    .prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND (sql LIKE '%users_old%' OR sql LIKE '%orders_old%')")
    .all() as { name: string; sql: string }[]);

  console.log(`Found ${affected.length} table(s) to fix:\n  ${affected.map(t => t.name).join(', ')}`);

  db.exec('BEGIN TRANSACTION');

  try {
    for (const { name, sql } of affected) {
      const tmpName = `__tmp_${name}`;
      const fixedSql = sql
        .replace(/"users_old"/g, 'users')
        .replace(/"orders_old"/g, 'orders');

      // 1. Get existing data
      const rows = db.prepare(`SELECT * FROM "${name}"`).all();
      console.log(`\n  [${name}] ${rows.length} row(s)`);

      // 2. Rename old table
      db.exec(`ALTER TABLE "${name}" RENAME TO "${tmpName}"`);

      // 3. Create with fixed DDL
      db.exec(fixedSql);

      // 4. Copy data back
      if (rows.length > 0) {
        const cols = Object.keys(rows[0] as Record<string, unknown>);
        const placeholders = cols.map(() => '?').join(', ');
        const insert = db.prepare(
          `INSERT INTO "${name}" (${cols.join(', ')}) VALUES (${placeholders})`
        );
        for (const row of rows) {
          insert.run(...cols.map(c => (row as any)[c]));
        }
      }

      // 5. Drop temp
      db.exec(`DROP TABLE "${tmpName}"`);
      console.log(`    ✅ Fixed`);
    }

    db.exec('COMMIT');
    console.log('\nAll FK references fixed!');

    // Verify no references remain
    const remaining = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND (sql LIKE '%users_old%' OR sql LIKE '%orders_old%')")
      .all();
    if (remaining.length > 0) {
      console.error('⚠  Still found stale references:', remaining);
    } else {
      console.log('✅ Verification: no stale FK references remain.');
    }
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
