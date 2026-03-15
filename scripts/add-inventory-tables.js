const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'loungeos.db');
const db = new Database(dbPath);

console.log('Adding inventory tables to database...');

try {
    // Add inventory tables
    db.exec(`
        -- Inventory Items Table
        CREATE TABLE IF NOT EXISTS inventory_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sku TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            unit TEXT NOT NULL DEFAULT 'pieces',
            min_stock_level INTEGER DEFAULT 10,
            max_stock_level INTEGER,
            current_stock INTEGER NOT NULL DEFAULT 0,
            cost_per_unit REAL,
            supplier_id INTEGER,
            image TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        );

        -- Inventory Movements Table
        CREATE TABLE IF NOT EXISTS inventory_movements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            movement_type TEXT NOT NULL CHECK(movement_type IN ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER')),
            quantity INTEGER NOT NULL,
            unit_cost REAL,
            total_cost REAL,
            reference_number TEXT,
            reference_type TEXT CHECK(reference_type IN ('PURCHASE_ORDER', 'SALES_ORDER', 'ADJUSTMENT', 'TRANSFER', 'WASTE', 'THEFT', 'DAMAGE')),
            notes TEXT,
            user_id INTEGER,
            movement_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (item_id) REFERENCES inventory_items(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        -- Inventory Categories Table
        CREATE TABLE IF NOT EXISTS inventory_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            color TEXT DEFAULT '#000000',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Inventory Suppliers Table
        CREATE TABLE IF NOT EXISTS inventory_suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            contact_person TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Add some default inventory categories
    db.exec(`
        INSERT OR IGNORE INTO inventory_categories (name, description, color) VALUES
        ('Produce', 'Fresh fruits and vegetables', '#4CAF50'),
        ('Dairy', 'Milk, cheese, and dairy products', '#2196F3'),
        ('Meat', 'Fresh and frozen meat products', '#F44336'),
        ('Pantry', 'Dry goods and canned items', '#FF9800'),
        ('Beverages', 'Drinks and liquid products', '#9C27B0'),
        ('Cleaning', 'Cleaning supplies and chemicals', '#607D8B'),
        ('Equipment', 'Kitchen equipment and tools', '#795548');
    `);

    // Add some default inventory suppliers
    db.exec(`
        INSERT OR IGNORE INTO inventory_suppliers (name, contact_person, phone, email) VALUES
        ('Fresh Foods Co.', 'John Smith', '+1-555-0101', 'john@freshfoods.com'),
        ('Quality Meats Ltd.', 'Sarah Johnson', '+1-555-0102', 'sarah@qualitymeats.com'),
        ('Dairy Delights', 'Mike Wilson', '+1-555-0103', 'mike@dairydelights.com'),
        ('Pantry Plus', 'Lisa Brown', '+1-555-0104', 'lisa@pantryplus.com'),
        ('Beverage World', 'David Lee', '+1-555-0105', 'david@beverageworld.com');
    `);

    console.log('✅ Inventory tables added successfully!');
    console.log('✅ Default categories and suppliers added.');

} catch (error) {
    console.error('❌ Error adding inventory tables:', error);
} finally {
    db.close();
} 