import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'temeh.db');
const db = new Database(dbPath);

console.log("Starting database schema repair...");

try {
    // 1. Repair held_carts
    console.log("Repairing held_carts...");
    db.exec(`
        CREATE TABLE IF NOT EXISTS held_carts_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cart_name TEXT,
            customer_name TEXT,
            customer_phone TEXT,
            items TEXT NOT NULL,
            subtotal REAL NOT NULL,
            tax_amount REAL DEFAULT 0,
            discount_amount REAL DEFAULT 0,
            total REAL NOT NULL,
            notes TEXT,
            user_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    `);
    
    // Check if old table exists to migrate data if possible
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='held_carts'").get();
    if (tableCheck) {
        console.log("Migrating data for held_carts...");
        try {
            db.exec("INSERT INTO held_carts_new SELECT * FROM held_carts");
        } catch (e) {
            console.log("Data migration for held_carts failed (likely schema mismatch), skipping data migration.");
        }
        db.exec("DROP TABLE held_carts");
    }
    db.exec("ALTER TABLE held_carts_new RENAME TO held_carts");

    // 2. Repair order_items
    console.log("Repairing order_items...");
    db.exec(`
        CREATE TABLE IF NOT EXISTS order_items_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            item_type TEXT NOT NULL,
            quantity REAL NOT NULL,
            price REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id)
        );
    `);

    const orderItemsCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='order_items'").get();
    if (orderItemsCheck) {
        console.log("Migrating data for order_items...");
        try {
            db.exec("INSERT INTO order_items_new SELECT * FROM order_items");
        } catch (e) {
            console.log("Data migration for order_items failed, skipping.");
        }
        db.exec("DROP TABLE order_items");
    }
    db.exec("ALTER TABLE order_items_new RENAME TO order_items");

    console.log("Database schema repair completed successfully.");
} catch (error) {
    console.error("Error during database repair:", error);
    process.exit(1);
} finally {
    db.close();
}
