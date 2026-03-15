import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'temeh.db');
const db = new Database(dbPath);

console.log("Verifying POS Fixes...");

try {
    // 1. Verify schemas are correct (no __tmp_ references)
    const ordersSchema = db.prepare("SELECT sql FROM sqlite_master WHERE name='orders'").get().sql;
    const orderItemsSchema = db.prepare("SELECT sql FROM sqlite_master WHERE name='order_items'").get().sql;
    const heldCartsSchema = db.prepare("SELECT sql FROM sqlite_master WHERE name='held_carts'").get().sql;

    if (orderItemsSchema.includes('__tmp_')) {
        console.error("FAIL: order_items still contains __tmp_ reference");
    } else {
        console.log("PASS: order_items schema is clean");
    }

    if (heldCartsSchema.includes('__tmp_')) {
        console.error("FAIL: held_carts still contains __tmp_ reference");
    } else {
        console.log("PASS: held_carts schema is clean");
    }

    // 2. Test inserting an order and its items
    const testOrderId = `TEST-ORD-${Date.now()}`;
    db.prepare("INSERT INTO orders (id, table_name, status, total, subtotal) VALUES (?, ?, ?, ?, ?)").run(testOrderId, 'POS-TEST', 'Completed', 1000, 1000);
    db.prepare("INSERT INTO order_items (order_id, product_id, item_type, quantity, price) VALUES (?, ?, ?, ?, ?)").run(testOrderId, '1', 'product', 1, 1000);
    
    const verifyOrder = db.prepare("SELECT id FROM orders WHERE id = ?").get(testOrderId);
    const verifyItems = db.prepare("SELECT id FROM order_items WHERE order_id = ?").get(testOrderId);

    if (verifyOrder && verifyItems) {
        console.log("PASS: Successfully inserted test order and items");
    } else {
        console.error("FAIL: Test order insertion failed");
    }

    // 3. Cleanup test
    db.prepare("DELETE FROM order_items WHERE order_id = ?").run(testOrderId);
    db.prepare("DELETE FROM orders WHERE id = ?").run(testOrderId);

    console.log("Verification complete.");
} catch (error) {
    console.error("Error during verification:", error);
} finally {
    db.close();
}
