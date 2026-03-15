const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbPath = path.join(process.cwd(), "loungeos.db");

if (!fs.existsSync(dbPath)) {
  console.error("Database file not found at:", dbPath);
  process.exit(1);
}

const db = new Database(dbPath);

try {
  console.log("Starting migration: Adding discount columns to orders table...");

  // Add columns if they don't exist
  const columnsToAdd = [
    { name: "subtotal", type: "REAL DEFAULT 0" },
    { name: "discount", type: "REAL DEFAULT 0" },
    { name: "discount_name", type: "TEXT" },
    { name: "tax", type: "REAL DEFAULT 0" },
    { name: "total", type: "REAL DEFAULT 0" },
  ];

  const existingColumns = db.prepare(`PRAGMA table_info(orders)`).all();
  const existingColumnNames = existingColumns.map((col) => col.name);

  db.transaction(() => {
    for (const col of columnsToAdd) {
      if (!existingColumnNames.includes(col.name)) {
        console.log(`Adding column: ${col.name}`);
        db.prepare(
          `ALTER TABLE orders ADD COLUMN ${col.name} ${col.type}`
        ).run();
      } else {
        console.log(`Column ${col.name} already exists, skipping.`);
      }
    }
  })();

  console.log("Migration completed successfully.");
} catch (error) {
  console.error("Migration failed:", error);
  process.exit(1);
} finally {
  db.close();
}
