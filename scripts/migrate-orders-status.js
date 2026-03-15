const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(process.cwd(), "loungeos.db");
const db = new Database(dbPath);

console.log('Migrating database to support "Canceled" order status...');

try {
  // Disable foreign keys
  db.pragma("foreign_keys = OFF");

  // 1. Rename old table
  db.prepare("ALTER TABLE orders RENAME TO orders_old").run();

  // 2. Create new table with updated CHECK constraint
  db.prepare(
    `
        CREATE TABLE orders (
            id TEXT PRIMARY KEY,
            table_name TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('Pending', 'In Progress', 'Ready', 'Completed', 'Canceled')),
            timestamp DATETIME NOT NULL
        )
    `
  ).run();

  // 3. Copy data from old table to new table
  db.prepare(
    "INSERT INTO orders (id, table_name, status, timestamp) SELECT id, table_name, status, timestamp FROM orders_old"
  ).run();

  // 4. Drop old table
  db.prepare("DROP TABLE orders_old").run();

  console.log("Migration successful!");

  // Re-enable foreign keys
  db.pragma("foreign_keys = ON");
} catch (error) {
  console.error("Migration failed:", error);
  // Attempt rollback if possible (manual intervention might be needed if it failed mid-way)
  try {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='orders_old'"
      )
      .get();
    if (tables) {
      console.log("Rolling back: Restoring orders_old...");
      db.prepare("DROP TABLE IF EXISTS orders").run();
      db.prepare("ALTER TABLE orders_old RENAME TO orders").run();
    }
  } catch (rollbackError) {
    console.error("Rollback failed:", rollbackError);
  }
} finally {
  db.close();
}
