import Database from 'better-sqlite3';
import path from 'path';

// This script should be run from the root of the project
const dbPath = path.resolve(process.cwd(), 'loungeos.db');
const db = new Database(dbPath, { verbose: console.log });

async function main() {
  console.log('Seeding inventory database...');

  // Create inventory tables if they don't exist
  db.exec(`
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
      FOREIGN KEY (supplier_id) REFERENCES inventory_suppliers(id)
    );

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

    CREATE TABLE IF NOT EXISTS inventory_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      color TEXT DEFAULT '#000000',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

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

  // Insert sample categories
  const categories = [
    { name: 'Beverages', description: 'Alcoholic and non-alcoholic drinks', color: '#3B82F6' },
    { name: 'Food Ingredients', description: 'Raw food materials and ingredients', color: '#10B981' },
    { name: 'Cleaning Supplies', description: 'Cleaning and maintenance materials', color: '#F59E0B' },
    { name: 'Paper & Packaging', description: 'Disposable items and packaging', color: '#8B5CF6' },
    { name: 'Equipment', description: 'Kitchen and bar equipment', color: '#EF4444' },
    { name: 'Condiments', description: 'Sauces, spices, and condiments', color: '#F97316' },
    { name: 'Dairy Products', description: 'Milk, cheese, and dairy items', color: '#06B6D4' },
    { name: 'Frozen Foods', description: 'Frozen ingredients and products', color: '#84CC16' }
  ];

  const insertCategory = db.prepare('INSERT OR REPLACE INTO inventory_categories (name, description, color) VALUES (?, ?, ?)');
  const insertCategoryMany = db.transaction((categoriesToInsert) => {
    for (const category of categoriesToInsert) {
      insertCategory.run(category.name, category.description, category.color);
      console.log(`Created category: ${category.name}`);
    }
  });

  insertCategoryMany(categories);

  // Insert sample suppliers
  const suppliers = [
    { name: 'Premium Beverages Ltd', contact_person: 'John Smith', phone: '+237 612345678', email: 'john@premiumbeverages.com', address: 'Douala, Cameroon' },
    { name: 'Fresh Foods Co', contact_person: 'Marie Dubois', phone: '+237 623456789', email: 'marie@freshfoods.com', address: 'Yaoundé, Cameroon' },
    { name: 'Quality Supplies Inc', contact_person: 'Pierre Martin', phone: '+237 634567890', email: 'pierre@qualitysupplies.com', address: 'Bamenda, Cameroon' },
    { name: 'Local Market', contact_person: 'Sarah Johnson', phone: '+237 645678901', email: 'sarah@localmarket.com', address: 'Buea, Cameroon' },
    { name: 'International Imports', contact_person: 'David Wilson', phone: '+237 656789012', email: 'david@internationalimports.com', address: 'Kribi, Cameroon' }
  ];

  const insertSupplier = db.prepare('INSERT OR REPLACE INTO inventory_suppliers (name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?)');
  const insertSupplierMany = db.transaction((suppliersToInsert) => {
    for (const supplier of suppliersToInsert) {
      insertSupplier.run(supplier.name, supplier.contact_person, supplier.phone, supplier.email, supplier.address);
      console.log(`Created supplier: ${supplier.name}`);
    }
  });

  insertSupplierMany(suppliers);

  // Insert sample inventory items
  const inventoryItems = [
    // Beverages
    { sku: 'BEV001', name: 'Heineken Beer', category: 'Beverages', description: 'Premium lager beer', unit: 'bottles', min_stock_level: 50, max_stock_level: 200, current_stock: 120, cost_per_unit: 800, supplier_id: 1 },
    { sku: 'BEV002', name: 'Guinness Stout', category: 'Beverages', description: 'Irish stout beer', unit: 'bottles', min_stock_level: 30, max_stock_level: 150, current_stock: 45, cost_per_unit: 900, supplier_id: 1 },
    { sku: 'BEV003', name: 'Coca Cola', category: 'Beverages', description: 'Classic cola drink', unit: 'bottles', min_stock_level: 100, max_stock_level: 300, current_stock: 250, cost_per_unit: 300, supplier_id: 1 },
    { sku: 'BEV004', name: 'Sprite', category: 'Beverages', description: 'Lemon-lime soda', unit: 'bottles', min_stock_level: 80, max_stock_level: 250, current_stock: 180, cost_per_unit: 300, supplier_id: 1 },
    { sku: 'BEV005', name: 'Red Wine', category: 'Beverages', description: 'Premium red wine', unit: 'bottles', min_stock_level: 20, max_stock_level: 100, current_stock: 35, cost_per_unit: 2500, supplier_id: 1 },
    { sku: 'BEV006', name: 'White Wine', category: 'Beverages', description: 'Premium white wine', unit: 'bottles', min_stock_level: 20, max_stock_level: 100, current_stock: 28, cost_per_unit: 2200, supplier_id: 1 },
    { sku: 'BEV007', name: 'Whiskey', category: 'Beverages', description: 'Premium whiskey', unit: 'bottles', min_stock_level: 15, max_stock_level: 80, current_stock: 25, cost_per_unit: 3500, supplier_id: 1 },
    { sku: 'BEV008', name: 'Vodka', category: 'Beverages', description: 'Premium vodka', unit: 'bottles', min_stock_level: 15, max_stock_level: 80, current_stock: 22, cost_per_unit: 3200, supplier_id: 1 },
    
    // Food Ingredients
    { sku: 'FOOD001', name: 'Beef', category: 'Food Ingredients', description: 'Fresh beef meat', unit: 'kg', min_stock_level: 20, max_stock_level: 100, current_stock: 45, cost_per_unit: 2500, supplier_id: 2 },
    { sku: 'FOOD002', name: 'Chicken', category: 'Food Ingredients', description: 'Fresh chicken meat', unit: 'kg', min_stock_level: 25, max_stock_level: 120, current_stock: 60, cost_per_unit: 1800, supplier_id: 2 },
    { sku: 'FOOD003', name: 'Fish', category: 'Food Ingredients', description: 'Fresh fish', unit: 'kg', min_stock_level: 15, max_stock_level: 80, current_stock: 30, cost_per_unit: 2200, supplier_id: 2 },
    { sku: 'FOOD004', name: 'Rice', category: 'Food Ingredients', description: 'Long grain rice', unit: 'kg', min_stock_level: 50, max_stock_level: 200, current_stock: 120, cost_per_unit: 800, supplier_id: 2 },
    { sku: 'FOOD005', name: 'Tomatoes', category: 'Food Ingredients', description: 'Fresh tomatoes', unit: 'kg', min_stock_level: 30, max_stock_level: 150, current_stock: 75, cost_per_unit: 600, supplier_id: 2 },
    { sku: 'FOOD006', name: 'Onions', category: 'Food Ingredients', description: 'Fresh onions', unit: 'kg', min_stock_level: 25, max_stock_level: 120, current_stock: 50, cost_per_unit: 400, supplier_id: 2 },
    { sku: 'FOOD007', name: 'Potatoes', category: 'Food Ingredients', description: 'Fresh potatoes', unit: 'kg', min_stock_level: 40, max_stock_level: 180, current_stock: 90, cost_per_unit: 500, supplier_id: 2 },
    { sku: 'FOOD008', name: 'Bread', category: 'Food Ingredients', description: 'Fresh bread', unit: 'loaves', min_stock_level: 20, max_stock_level: 100, current_stock: 35, cost_per_unit: 300, supplier_id: 2 },
    
    // Cleaning Supplies
    { sku: 'CLEAN001', name: 'Dish Soap', category: 'Cleaning Supplies', description: 'Liquid dish soap', unit: 'bottles', min_stock_level: 10, max_stock_level: 50, current_stock: 25, cost_per_unit: 1200, supplier_id: 3 },
    { sku: 'CLEAN002', name: 'Floor Cleaner', category: 'Cleaning Supplies', description: 'Floor cleaning solution', unit: 'bottles', min_stock_level: 8, max_stock_level: 40, current_stock: 15, cost_per_unit: 1800, supplier_id: 3 },
    { sku: 'CLEAN003', name: 'Paper Towels', category: 'Cleaning Supplies', description: 'Kitchen paper towels', unit: 'rolls', min_stock_level: 30, max_stock_level: 150, current_stock: 80, cost_per_unit: 500, supplier_id: 3 },
    { sku: 'CLEAN004', name: 'Trash Bags', category: 'Cleaning Supplies', description: 'Large trash bags', unit: 'bags', min_stock_level: 20, max_stock_level: 100, current_stock: 45, cost_per_unit: 800, supplier_id: 3 },
    
    // Paper & Packaging
    { sku: 'PAPER001', name: 'Napkins', category: 'Paper & Packaging', description: 'Paper napkins', unit: 'packs', min_stock_level: 25, max_stock_level: 120, current_stock: 60, cost_per_unit: 400, supplier_id: 4 },
    { sku: 'PAPER002', name: 'To-Go Boxes', category: 'Paper & Packaging', description: 'Food takeaway boxes', unit: 'boxes', min_stock_level: 50, max_stock_level: 200, current_stock: 120, cost_per_unit: 200, supplier_id: 4 },
    { sku: 'PAPER003', name: 'Straws', category: 'Paper & Packaging', description: 'Plastic drinking straws', unit: 'packs', min_stock_level: 40, max_stock_level: 180, current_stock: 90, cost_per_unit: 300, supplier_id: 4 },
    { sku: 'PAPER004', name: 'Cups', category: 'Paper & Packaging', description: 'Disposable cups', unit: 'packs', min_stock_level: 30, max_stock_level: 150, current_stock: 75, cost_per_unit: 600, supplier_id: 4 },
    
    // Condiments
    { sku: 'COND001', name: 'Ketchup', category: 'Condiments', description: 'Tomato ketchup', unit: 'bottles', min_stock_level: 15, max_stock_level: 80, current_stock: 35, cost_per_unit: 800, supplier_id: 5 },
    { sku: 'COND002', name: 'Mustard', category: 'Condiments', description: 'Yellow mustard', unit: 'bottles', min_stock_level: 10, max_stock_level: 60, current_stock: 25, cost_per_unit: 700, supplier_id: 5 },
    { sku: 'COND003', name: 'Mayonnaise', category: 'Condiments', description: 'Creamy mayonnaise', unit: 'bottles', min_stock_level: 12, max_stock_level: 70, current_stock: 30, cost_per_unit: 900, supplier_id: 5 },
    { sku: 'COND004', name: 'Hot Sauce', category: 'Condiments', description: 'Spicy hot sauce', unit: 'bottles', min_stock_level: 8, max_stock_level: 50, current_stock: 20, cost_per_unit: 600, supplier_id: 5 },
    { sku: 'COND005', name: 'Salt', category: 'Condiments', description: 'Table salt', unit: 'kg', min_stock_level: 5, max_stock_level: 30, current_stock: 15, cost_per_unit: 400, supplier_id: 5 },
    { sku: 'COND006', name: 'Black Pepper', category: 'Condiments', description: 'Ground black pepper', unit: 'kg', min_stock_level: 3, max_stock_level: 20, current_stock: 8, cost_per_unit: 1200, supplier_id: 5 },
    
    // Dairy Products
    { sku: 'DAIRY001', name: 'Milk', category: 'Dairy Products', description: 'Fresh whole milk', unit: 'liters', min_stock_level: 20, max_stock_level: 100, current_stock: 45, cost_per_unit: 600, supplier_id: 2 },
    { sku: 'DAIRY002', name: 'Cheese', category: 'Dairy Products', description: 'Cheddar cheese', unit: 'kg', min_stock_level: 10, max_stock_level: 50, current_stock: 25, cost_per_unit: 1800, supplier_id: 2 },
    { sku: 'DAIRY003', name: 'Butter', category: 'Dairy Products', description: 'Unsalted butter', unit: 'kg', min_stock_level: 8, max_stock_level: 40, current_stock: 18, cost_per_unit: 2200, supplier_id: 2 },
    { sku: 'DAIRY004', name: 'Yogurt', category: 'Dairy Products', description: 'Plain yogurt', unit: 'liters', min_stock_level: 15, max_stock_level: 80, current_stock: 35, cost_per_unit: 800, supplier_id: 2 },
    
    // Equipment (low stock items for testing)
    { sku: 'EQUIP001', name: 'Coffee Maker', category: 'Equipment', description: 'Commercial coffee machine', unit: 'units', min_stock_level: 2, max_stock_level: 10, current_stock: 1, cost_per_unit: 150000, supplier_id: 3 },
    { sku: 'EQUIP002', name: 'Blender', category: 'Equipment', description: 'Commercial blender', unit: 'units', min_stock_level: 3, max_stock_level: 15, current_stock: 2, cost_per_unit: 45000, supplier_id: 3 },
    { sku: 'EQUIP003', name: 'Microwave', category: 'Equipment', description: 'Commercial microwave', unit: 'units', min_stock_level: 2, max_stock_level: 8, current_stock: 0, cost_per_unit: 80000, supplier_id: 3 },
    
    // Frozen Foods
    { sku: 'FROZEN001', name: 'French Fries', category: 'Frozen Foods', description: 'Frozen french fries', unit: 'kg', min_stock_level: 30, max_stock_level: 150, current_stock: 70, cost_per_unit: 1200, supplier_id: 5 },
    { sku: 'FROZEN002', name: 'Ice Cream', category: 'Frozen Foods', description: 'Vanilla ice cream', unit: 'liters', min_stock_level: 20, max_stock_level: 100, current_stock: 45, cost_per_unit: 1500, supplier_id: 5 },
    { sku: 'FROZEN003', name: 'Frozen Vegetables', category: 'Frozen Foods', description: 'Mixed frozen vegetables', unit: 'kg', min_stock_level: 25, max_stock_level: 120, current_stock: 55, cost_per_unit: 1000, supplier_id: 5 }
  ];

  const insertItem = db.prepare(`
    INSERT OR REPLACE INTO inventory_items (
      sku, name, category, description, unit, min_stock_level, max_stock_level, 
      current_stock, cost_per_unit, supplier_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertItemMany = db.transaction((itemsToInsert) => {
    for (const item of itemsToInsert) {
      insertItem.run(
        item.sku,
        item.name,
        item.category,
        item.description,
        item.unit,
        item.min_stock_level,
        item.max_stock_level,
        item.current_stock,
        item.cost_per_unit,
        item.supplier_id
      );
      console.log(`Created item: ${item.name}`);
    }
  });

  insertItemMany(inventoryItems);

  // Insert sample movements for the last 30 days
  const movements = [
    // Stock In movements
    { item_id: 1, movement_type: 'IN', quantity: 50, unit_cost: 800, reference_type: 'PURCHASE_ORDER', reference_number: 'PO-2024-001', notes: 'Monthly restock', user_id: 1 },
    { item_id: 2, movement_type: 'IN', quantity: 30, unit_cost: 900, reference_type: 'PURCHASE_ORDER', reference_number: 'PO-2024-002', notes: 'Weekly restock', user_id: 1 },
    { item_id: 3, movement_type: 'IN', quantity: 100, unit_cost: 300, reference_type: 'PURCHASE_ORDER', reference_number: 'PO-2024-003', notes: 'Bulk order', user_id: 1 },
    { item_id: 9, movement_type: 'IN', quantity: 25, unit_cost: 2500, reference_type: 'PURCHASE_ORDER', reference_number: 'PO-2024-004', notes: 'Fresh meat delivery', user_id: 1 },
    { item_id: 10, movement_type: 'IN', quantity: 40, unit_cost: 1800, reference_type: 'PURCHASE_ORDER', reference_number: 'PO-2024-005', notes: 'Chicken restock', user_id: 1 },
    
    // Stock Out movements
    { item_id: 1, movement_type: 'OUT', quantity: 15, unit_cost: 800, reference_type: 'SALES_ORDER', reference_number: 'SO-2024-001', notes: 'Bar sales', user_id: 1 },
    { item_id: 2, movement_type: 'OUT', quantity: 8, unit_cost: 900, reference_type: 'SALES_ORDER', reference_number: 'SO-2024-002', notes: 'Bar sales', user_id: 1 },
    { item_id: 3, movement_type: 'OUT', quantity: 25, unit_cost: 300, reference_type: 'SALES_ORDER', reference_number: 'SO-2024-003', notes: 'Bar sales', user_id: 1 },
    { item_id: 9, movement_type: 'OUT', quantity: 5, unit_cost: 2500, reference_type: 'SALES_ORDER', reference_number: 'SO-2024-004', notes: 'Kitchen usage', user_id: 1 },
    { item_id: 10, movement_type: 'OUT', quantity: 8, unit_cost: 1800, reference_type: 'SALES_ORDER', reference_number: 'SO-2024-005', notes: 'Kitchen usage', user_id: 1 },
    
    // Adjustment movements
    { item_id: 1, movement_type: 'ADJUSTMENT', quantity: -2, unit_cost: 800, reference_type: 'WASTE', reference_number: 'ADJ-2024-001', notes: 'Expired bottles', user_id: 1 },
    { item_id: 9, movement_type: 'ADJUSTMENT', quantity: -1, unit_cost: 2500, reference_type: 'WASTE', reference_number: 'ADJ-2024-002', notes: 'Spoiled meat', user_id: 1 },
    { item_id: 25, movement_type: 'ADJUSTMENT', quantity: -1, unit_cost: 150000, reference_type: 'DAMAGE', reference_number: 'ADJ-2024-003', notes: 'Equipment malfunction', user_id: 1 },
    { item_id: 27, movement_type: 'ADJUSTMENT', quantity: -1, unit_cost: 80000, reference_type: 'DAMAGE', reference_number: 'ADJ-2024-004', notes: 'Equipment damage', user_id: 1 }
  ];

  const insertMovement = db.prepare(`
    INSERT INTO inventory_movements (
      item_id, movement_type, quantity, unit_cost, total_cost, reference_type, 
      reference_number, notes, user_id, movement_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMovementMany = db.transaction((movementsToInsert) => {
    for (const movement of movementsToInsert) {
      const totalCost = movement.unit_cost * movement.quantity;
      const movementDate = new Date();
      movementDate.setDate(movementDate.getDate() - Math.floor(Math.random() * 30)); // Random date in last 30 days
      
      insertMovement.run(
        movement.item_id,
        movement.movement_type,
        movement.quantity,
        movement.unit_cost,
        totalCost,
        movement.reference_type,
        movement.reference_number,
        movement.notes,
        movement.user_id,
        movementDate.toISOString()
      );
      console.log(`Created movement: ${movement.reference_number}`);
    }
  });

  insertMovementMany(movements);

  console.log('Inventory database seeded successfully!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(() => {
  db.close();
}); 