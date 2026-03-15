
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db');

async function resetDatabase() {
  console.log('Starting Cold Store System Reset...');
  console.log(`Database path: ${dbPath}`);

  if (!fs.existsSync(dbPath)) {
    console.log('Database does not exist. No need to flush.');
    return;
  }

  const db = new Database(dbPath);

  try {
    // 1. Backup Super Admins
    console.log('Backing up Super Admins...');
    const superAdmins = db.prepare("SELECT * FROM users WHERE role = 'super_admin'").all();
    console.log(`Found ${superAdmins.length} super admins.`);

    // 2. Drop Tables
    console.log('Dropping tables...');
    const tables = [
      'orders', 
      'order_items', 
      'inventory_movements', 
      'activity_logs', 
      'notifications', 
      'inventory_items', 
      'inventory_categories',
      'inventory_suppliers',
      'users', // We drop users to ensure clean slate, then restore super admins
      'products', // Legacy
      'categories', // Legacy
      'saved_orders' // Drop if exists
    ];

    db.exec('PRAGMA foreign_keys = OFF;');
    for (const table of tables) {
      db.exec(`DROP TABLE IF EXISTS ${table};`);
    }
    db.exec('PRAGMA foreign_keys = ON;');

    // 3. Re-Create Tables (Schema Definition)
    console.log('Creating new schema...');
    
    // Users
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('super_admin', 'admin', 'staff')),
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        avatar TEXT,
        floor INTEGER,
        phone TEXT,
        hire_date DATE,
        force_password_change INTEGER DEFAULT 0,
        emergency_contact_name TEXT,
        emergency_contact_relationship TEXT,
        emergency_contact_phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Inventory Items (Cold Store Schema)
    db.exec(`
      CREATE TABLE inventory_suppliers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          contact_person TEXT,
          phone TEXT,
          email TEXT,
          address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE inventory_categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          color TEXT DEFAULT '#000000',
          parent_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES inventory_categories(id)
      );

      CREATE TABLE inventory_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sku TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT,
          unit TEXT NOT NULL DEFAULT 'pieces',
          unit_type TEXT DEFAULT 'Piece' CHECK(unit_type IN ('Carton', 'Kilo', 'Piece', 'KG', 'Litre')),
          min_stock_level INTEGER DEFAULT 10,
          max_stock_level INTEGER,
          current_stock REAL NOT NULL DEFAULT 0, -- REAL for KG
          cost_per_unit REAL,
          selling_price REAL DEFAULT 0,
          supplier_id INTEGER,
          image TEXT,
          expiry_date DATE,
          batch_number TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (supplier_id) REFERENCES inventory_suppliers(id)
      );

      CREATE TABLE inventory_movements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_id INTEGER NOT NULL,
          movement_type TEXT NOT NULL CHECK(movement_type IN ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER')),
          quantity REAL NOT NULL, -- REAL for KG
          unit_cost REAL,
          total_cost REAL,
          reference_number TEXT,
          reference_type TEXT,
          notes TEXT,
          user_id INTEGER,
          movement_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (item_id) REFERENCES inventory_items(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // Orders / Sales
    db.exec(`
      CREATE TABLE orders (
          id TEXT PRIMARY KEY,
          table_name TEXT, -- Optional now
          status TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          subtotal REAL NOT NULL,
          discount REAL DEFAULT 0,
          discount_name TEXT,
          tax REAL DEFAULT 0,
          total REAL NOT NULL,
          waiter_id INTEGER,
          cancelled_by INTEGER,
          cancellation_reason TEXT,
          cancelled_at DATETIME,
          payment_method TEXT,
          FOREIGN KEY (waiter_id) REFERENCES users(id)
      );

      CREATE TABLE order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id TEXT NOT NULL,
          product_id TEXT NOT NULL, -- Can be 'inv_123'
          item_type TEXT NOT NULL,
          quantity REAL NOT NULL, -- REAL for KG
          price REAL NOT NULL,
          FOREIGN KEY (order_id) REFERENCES orders(id)
      );
    `);

    // Saved Orders
    db.exec(`
      CREATE TABLE saved_orders (
          id TEXT PRIMARY KEY,
          name TEXT,
          items TEXT NOT NULL, -- JSON string of items
          total REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          saved_by INTEGER,
          FOREIGN KEY (saved_by) REFERENCES users(id)
      );
    `);

    // Activity & Notifications
    db.exec(`
      CREATE TABLE activity_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          details TEXT,
          entity_id TEXT,
          metadata TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL,
          status TEXT DEFAULT 'unread',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Restore Super Admins
    console.log('Restoring Super Admins...');
    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, password, role, status, avatar, phone, created_at)
      VALUES (@id, @name, @email, @password, @role, @status, @avatar, @phone, @created_at)
    `);

    for (const admin of superAdmins as any[]) {
      insertUser.run(admin);
    }

    // 5. Seed General Category
    console.log('Seeding initial data...');
    db.prepare("INSERT INTO inventory_categories (name, description) VALUES ('General', 'General items')").run();

    console.log('System Flush & Cold Store Update Complete!');

  } catch (error) {
    console.error('Error during reset:', error);
  } finally {
    db.close();
  }
}

resetDatabase();
