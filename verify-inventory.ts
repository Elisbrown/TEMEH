
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'loungeos.db');
const db = new Database(dbPath);

console.log('--- Inventory Verification ---');

// Check Items
const items = db.prepare('SELECT COUNT(*) as count FROM inventory_items').get() as { count: number };
console.log(`Inventory Items: ${items.count}`);

// Check Movements
const movements = db.prepare('SELECT COUNT(*) as count FROM inventory_movements').get() as { count: number };
console.log(`Inventory Movements: ${movements.count}`);

// Check Categories
const categories = db.prepare('SELECT COUNT(*) as count FROM inventory_categories').get() as { count: number };
console.log(`Inventory Categories: ${categories.count}`);

// Check Suppliers
const suppliers = db.prepare('SELECT COUNT(*) as count FROM inventory_suppliers').get() as { count: number };
console.log(`Inventory Suppliers: ${suppliers.count}`);

// Check Dashboard Data Query (simplified)
try {
    const stockMovements = db.prepare(`
        SELECT 
            strftime('%m', m.movement_date) as month,
            strftime('%Y', m.movement_date) as year,
            m.movement_type,
            COALESCE(SUM(m.quantity), 0) as quantity
        FROM inventory_movements m
        WHERE m.movement_date >= date('now', '-6 months')
        GROUP BY strftime('%Y-%m', m.movement_date), m.movement_type
        ORDER BY year, month
    `).all();
    console.log(`Dashboard Stock Movements Data Points: ${stockMovements.length}`);
} catch (error) {
    console.error('Error running dashboard query:', error);
}

console.log('--- End Verification ---');
