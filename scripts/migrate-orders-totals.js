const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(process.cwd(), "loungeos.db");
const db = new Database(dbPath);

try {
  console.log(
    "Starting migration: Populating order totals for existing orders..."
  );

  // Get all completed orders that have NULL or 0 total
  const ordersToUpdate = db
    .prepare(
      `
    SELECT DISTINCT o.id
    FROM orders o
    WHERE o.status = 'Completed' 
    AND (o.total IS NULL OR o.total = 0)
  `
    )
    .all();

  console.log(`Found ${ordersToUpdate.length} orders to update`);

  let updated = 0;
  db.transaction(() => {
    for (const order of ordersToUpdate) {
      // Calculate the total from order items
      const itemsTotal = db
        .prepare(
          `
        SELECT COALESCE(SUM(oi.quantity * oi.price), 0) as total
        FROM order_items oi
        WHERE oi.order_id = ?
      `
        )
        .get(order.id);

      const calculatedTotal = itemsTotal.total || 0;

      if (calculatedTotal > 0) {
        // Update the order with calculated values
        db.prepare(
          `
          UPDATE orders 
          SET subtotal = ?, 
              total = ?,
              discount = 0,
              tax = 0
          WHERE id = ?
        `
        ).run(calculatedTotal, calculatedTotal, order.id);

        updated++;
      }
    }
  })();

  console.log(`Migration completed successfully. Updated ${updated} orders.`);
} catch (error) {
  console.error("Migration failed:", error);
  process.exit(1);
} finally {
  db.close();
}
