
// src/lib/db/orders.ts
import Database from 'better-sqlite3';
import path from 'path';
import type { Order, OrderItem } from '@/context/order-context';
import fs from 'fs';

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db');

let dbInstance: Database.Database | null = null;

// This function now handles creation and initialization
function getDb(): Database.Database {
    if (dbInstance && dbInstance.open) {
        return dbInstance;
    }

    const dbExists = fs.existsSync(dbPath);
    const db = new Database(dbPath);

    if (!dbExists) {
        console.log("Database file not found, creating and initializing schema...");
        const schema = fs.readFileSync(path.join(process.cwd(), 'docs', 'database.md'), 'utf8');
        const sqlOnly = schema.split('```sql')[1].split('```')[0];
        db.exec(sqlOnly);
        console.log("Database schema initialized.");
    }

    dbInstance = db;
    return db;
}


// Function to get a single order, useful for transactions
export function getOrderById(id: string, db: Database.Database = getDb()): Order | null {
    const row = db.prepare(`
        SELECT id, table_name, status, timestamp, subtotal, discount, discount_name, tax, total, cashier_id,
               cancelled_by, cancellation_reason, cancelled_at, payment_method
        FROM orders WHERE id = ?
    `).get(id) as any;

    if (!row) return null;

    const itemStmt = db.prepare(`
        SELECT p.id, p.name, oi.quantity, oi.price, p.category, p.image, oi.item_type
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id AND oi.item_type = 'product'
        WHERE oi.order_id = ?
    `);

    const items = itemStmt.all(row.id) as any[];

    // If some items are inventory items, we might need to join with inventory_items table
    // For now, let's just make sure we handle the mapping correctly
    const mappedItems: OrderItem[] = items.map(item => {
        if (item.item_type === 'inventory_item') {
            // Re-fetch from inventory_items if name is null (since we joined with products)
            if (!item.name) {
                const invItem = db.prepare('SELECT name, category, image FROM inventory_items WHERE id = ?').get(item.id) as any;
                if (invItem) {
                    return {
                        ...item,
                        id: `inv_${item.id}`,
                        name: invItem.name,
                        category: invItem.category,
                        image: invItem.image
                    };
                }
            }
            return { ...item, id: `inv_${item.id}` };
        }
        return {
            ...item,
            id: String(item.id)
        };
    });

    return {
        id: row.id,
        table: row.table_name,
        status: row.status,
        timestamp: new Date(row.timestamp),
        items: mappedItems,
        subtotal: row.subtotal || 0,
        discount: row.discount || 0,
        discountName: row.discount_name,
        tax: row.tax || 0,
        total: row.total || 0,
        cashier_id: row.cashier_id,
        cancelled_by: row.cancelled_by,
        cancellation_reason: row.cancellation_reason,
        cancelled_at: row.cancelled_at ? new Date(row.cancelled_at) : undefined,
        payment_method: row.payment_method
    };
}

export async function getOrders(): Promise<Order[]> {
    const db = getDb();
    try {
        const rows = db.prepare(`
            SELECT
                o.id as order_id,
                o.table_name,
                o.status,
                o.timestamp,
                o.subtotal,
                o.discount,
                o.discount_name,
                o.tax,
                o.total,
                o.cashier_id,
                o.cancelled_by,
                o.cancellation_reason,
                o.cancelled_at,
                o.payment_method,
                oi.product_id,
                oi.item_type,
                oi.price as item_price,
                oi.quantity as item_quantity,
                p.name as product_name,
                p.category as product_category,
                p.image as product_image,
                ii.name as inv_name,
                ii.category as inv_category,
                ii.image as inv_image
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id AND oi.item_type = 'product'
            LEFT JOIN inventory_items ii ON oi.product_id = ii.id AND oi.item_type = 'inventory_item'
            ORDER BY o.timestamp DESC
        `).all() as any[];

        const ordersMap = new Map<string, Order>();

        for (const row of rows) {
            if (!ordersMap.has(row.order_id)) {
                ordersMap.set(row.order_id, {
                    id: row.order_id,
                    table: row.table_name,
                    status: row.status,
                    timestamp: new Date(row.timestamp),
                    items: [],
                    subtotal: row.subtotal || 0,
                    discount: row.discount || 0,
                    discountName: row.discount_name,
                    tax: row.tax || 0,
                    total: row.total || 0,
                    cashier_id: row.cashier_id,
                    cancelled_by: row.cancelled_by,
                    cancellation_reason: row.cancellation_reason,
                    cancelled_at: row.cancelled_at ? new Date(row.cancelled_at) : undefined,
                    payment_method: row.payment_method
                });
            }

            if (row.product_id) {
                const order = ordersMap.get(row.order_id)!;
                const isInv = row.item_type === 'inventory_item';
                order.items.push({
                    id: isInv ? `inv_${row.product_id}` : String(row.product_id),
                    name: isInv ? row.inv_name : row.product_name,
                    price: row.item_price,
                    quantity: row.item_quantity,
                    category: isInv ? row.inv_category : row.product_category,
                    image: isInv ? row.inv_image : row.product_image,
                });
            }
        }

        return Array.from(ordersMap.values());
    } finally {
        // No close
    }
}


export async function addOrder(order: Omit<Order, 'id' | 'timestamp'> & { id?: string, timestamp?: Date, cashier_id?: number }): Promise<Order> {
    const db = getDb();
    const transaction = db.transaction((ord) => {
        const orderId = ord.id || `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        const timestamp = (ord.timestamp || new Date()).toISOString();

        // Calculate totals if not provided
        let subtotal = ord.subtotal || 0;
        let total = ord.total || 0;

        if (subtotal === 0 && ord.items.length > 0) {
            subtotal = ord.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
        }
        if (total === 0) {
            total = subtotal + (ord.tax || 0) - (ord.discount || 0);
        }

        const orderStmt = db.prepare('INSERT INTO orders (id, table_name, status, timestamp, subtotal, discount, discount_name, tax, total, cashier_id, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        orderStmt.run(orderId, ord.table, ord.status, timestamp, subtotal, ord.discount || 0, ord.discountName || null, ord.tax || 0, total, ord.cashier_id || null, ord.payment_method || null);

        const itemStmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price, item_type) VALUES (?, ?, ?, ?, ?)');
        for (const item of ord.items) {
            let productId: number;
            let itemType = 'product';

            if (typeof item.id === 'string' && item.id.startsWith('inv_')) {
                productId = parseInt(item.id.replace('inv_', ''), 10);
                itemType = 'inventory_item';

                // Deduct from inventory_items
                db.prepare('UPDATE inventory_items SET current_stock = current_stock - ? WHERE id = ?').run(item.quantity, productId);
            } else {
                productId = typeof item.id === 'string' ? parseInt(item.id, 10) : item.id;

                // Deduct from products
                db.prepare('UPDATE products SET quantity = quantity - ? WHERE id = ?').run(item.quantity, productId);
            }

            if (isNaN(productId)) throw new Error(`Invalid product ID: ${item.id}`);

            itemStmt.run(orderId, productId, item.quantity, item.price, itemType);
        }

        return getOrderById(orderId, db)!;
    });

    try {
        return transaction(order);
    } finally {
        // No close
    }
}


export async function updateOrderStatus(
    orderId: string,
    status: Order['status'],
    cancelled_by?: number,
    cancellation_reason?: string,
    cancelled_at?: string | Date
): Promise<Order> {
    const db = getDb();
    const transaction = db.transaction((id, newStatus, cb, cr, ca) => {
        // Update order status, timestamp and cancellation info if provided
        db.prepare(`
            UPDATE orders SET 
                status = ?, 
                timestamp = ?, 
                cancelled_by = COALESCE(?, cancelled_by),
                cancellation_reason = COALESCE(?, cancellation_reason),
                cancelled_at = COALESCE(?, cancelled_at)
            WHERE id = ?
        `).run(
            newStatus,
            new Date().toISOString(),
            cb || null,
            cr || null,
            ca ? (ca instanceof Date ? ca.toISOString() : ca) : null,
            id
        );

        return getOrderById(id, db)!;
    });

    try {
        return transaction(orderId, status, cancelled_by, cancellation_reason, cancelled_at);
    } finally {
        // No close
    }
}

export async function updateOrder(updatedOrder: Order & { cashier_id?: number, cancelled_by?: number, cancellation_reason?: string, cancelled_at?: Date }): Promise<Order> {
    const db = getDb();
    const transaction = db.transaction((order) => {
        // Build update query dynamically based on what fields are provided
        const hasFinancials = order.subtotal !== undefined || order.discount !== undefined || order.tax !== undefined || order.total !== undefined;

        if (hasFinancials) {
            let subtotal = order.subtotal || 0;
            let total = order.total || 0;

            if (subtotal === 0 && order.items && order.items.length > 0) {
                subtotal = order.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
            }
            if (total === 0) {
                total = subtotal + (order.tax || 0) - (order.discount || 0);
            }

            // Update order with all fields including financials and cancellation fields
            db.prepare(`
                UPDATE orders SET 
                    status = ?, 
                    timestamp = ?, 
                    subtotal = ?, 
                    discount = ?, 
                    discount_name = ?, 
                    tax = ?, 
                    total = ?, 
                    cashier_id = COALESCE(?, cashier_id),
                    cancelled_by = COALESCE(?, cancelled_by),
                    cancellation_reason = COALESCE(?, cancellation_reason),
                    cancelled_at = COALESCE(?, cancelled_at),
                    payment_method = COALESCE(?, payment_method)
                WHERE id = ?
            `).run(
                order.status,
                order.timestamp ? (order.timestamp instanceof Date ? order.timestamp.toISOString() : order.timestamp) : new Date().toISOString(),
                subtotal,
                order.discount || 0,
                order.discountName || null,
                order.tax || 0,
                total,
                order.cashier_id || null,
                order.cancelled_by || null,
                order.cancellation_reason || null,
                order.cancelled_at ? (order.cancelled_at instanceof Date ? order.cancelled_at.toISOString() : order.cancelled_at) : null,
                order.payment_method || null,
                order.id
            );
        } else {
            // Update status and timestamp along with cancellation info if provided
            db.prepare(`
                UPDATE orders SET 
                    status = ?, 
                    timestamp = ?, 
                    cashier_id = COALESCE(?, cashier_id),
                    cancelled_by = COALESCE(?, cancelled_by),
                    cancellation_reason = COALESCE(?, cancellation_reason),
                    cancelled_at = COALESCE(?, cancelled_at)
                WHERE id = ?
            `).run(
                order.status,
                order.timestamp ? (order.timestamp instanceof Date ? order.timestamp.toISOString() : order.timestamp) : new Date().toISOString(),
                order.cashier_id || null,
                order.cancelled_by || null,
                order.cancellation_reason || null,
                order.cancelled_at ? (order.cancelled_at instanceof Date ? order.cancelled_at.toISOString() : order.cancelled_at) : null,
                order.id
            );
        }

        // Only update items if items array is provided and not empty
        if (order.items && order.items.length > 0) {
            // Delete existing items
            db.prepare('DELETE FROM order_items WHERE order_id = ?').run(order.id);

            const itemStmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price, item_type) VALUES (?, ?, ?, ?, ?)');
            for (const item of order.items) {
                let productId: number;
                let itemType = 'product';

                if (typeof item.id === 'string' && item.id.startsWith('inv_')) {
                    productId = parseInt(item.id.replace('inv_', ''), 10);
                    itemType = 'inventory_item';
                } else {
                    productId = typeof item.id === 'string' ? parseInt(item.id, 10) : item.id;
                }

                if (isNaN(productId)) throw new Error(`Invalid product ID: ${item.id}`);
                itemStmt.run(order.id, productId, item.quantity, item.price, itemType);
            }
        }
        return getOrderById(order.id, db)!;
    });

    try {
        return transaction(updatedOrder);
    } finally {
        // No close
    }
}

export async function deleteOrder(orderId: string): Promise<{ id: string }> {
    const db = getDb();
    const transaction = db.transaction((id) => {
        db.prepare('DELETE FROM order_items WHERE order_id = ?').run(id);
        db.prepare('DELETE FROM orders WHERE id = ?').run(id);
    });
    try {
        transaction(orderId);
        return { id: orderId };
    } finally {
        // No close
    }
}

export async function splitOrder(orderId: string, itemsToSplit: OrderItem[]): Promise<{ updatedOrder: Order, newOrder: Order }> {
    const db = getDb();
    const transaction = db.transaction((id, items) => {
        const originalOrder = getOrderById(id, db);
        if (!originalOrder) {
            throw new Error("Original order not found");
        }

        const newOrderId = `ORD-${Date.now()}-SPLIT`;

        // Calculate remaining items after split - properly reduce quantities
        const remainingItems: OrderItem[] = [];
        for (const originalItem of originalOrder.items) {
            const splitItem = items.find((s: any) => s.id === originalItem.id);
            if (splitItem) {
                // Item is being split - calculate remaining quantity
                const remainingQty = originalItem.quantity - splitItem.quantity;
                if (remainingQty > 0) {
                    remainingItems.push({ ...originalItem, quantity: remainingQty });
                }
                // If remainingQty <= 0, don't add to remaining (fully split)
            } else {
                // Item not being split - keep as is
                remainingItems.push(originalItem);
            }
        }

        // Create the new order with the split items
        const newOrderData: Order = {
            id: newOrderId,
            table: originalOrder.table,
            items: items,
            status: 'Pending',
            timestamp: new Date()
        };

        // Calculate subtotal for new order
        const newSubtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

        const newOrderStmt = db.prepare('INSERT INTO orders (id, table_name, status, timestamp, subtotal, discount, discount_name, tax, total, cashier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        newOrderStmt.run(newOrderData.id, newOrderData.table, newOrderData.status, newOrderData.timestamp.toISOString(), newSubtotal, 0, null, 0, newSubtotal, originalOrder.cashier_id || null);

        // Helper to safely parse IDs
        const prepareItemValues = (item: OrderItem, orderId: string) => {
            let productId: number | string;
            let itemType = 'product';
            const idStr = String(item.id);

            if (idStr.startsWith('inv_')) {
                const rawId = idStr.replace('inv_', '');
                const parsedId = parseInt(rawId, 10);
                // If parsing fails (NaN), assume strictly string ID (alphanumeric inventory id)
                productId = isNaN(parsedId) ? rawId : parsedId;
                itemType = 'inventory_item';
            } else {
                const parsedId = parseInt(idStr, 10);
                productId = isNaN(parsedId) ? idStr : parsedId;
            }

            if (productId === null || productId === undefined || (typeof productId === 'number' && isNaN(productId))) {
                console.error(`Invalid Product ID for item: ${JSON.stringify(item)}`);
                throw new Error(`Invalid Product ID encountered: ${item.id}`);
            }

            return { orderId, productId, quantity: item.quantity, price: item.price, itemType };
        };

        const insertItemStmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price, item_type) VALUES (@orderId, @productId, @quantity, @price, @itemType)');

        // Insert new order items
        for (const item of newOrderData.items) {
            insertItemStmt.run(prepareItemValues(item, newOrderData.id));
        }

        // Update the original order with the remaining items
        if (remainingItems.length === 0) {
            // If no items left, delete original order
            db.prepare('DELETE FROM order_items WHERE order_id = ?').run(originalOrder.id);
            db.prepare('DELETE FROM orders WHERE id = ?').run(originalOrder.id);
        } else {
            // Delete old items and insert remaining items
            db.prepare('DELETE FROM order_items WHERE order_id = ?').run(originalOrder.id);

            for (const item of remainingItems) {
                insertItemStmt.run(prepareItemValues(item, originalOrder.id));
            }

            // Recalculate subtotal and total for original order
            const remainingSubtotal = remainingItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            db.prepare('UPDATE orders SET subtotal = ?, total = ? - discount + tax, timestamp = ? WHERE id = ?')
                .run(remainingSubtotal, remainingSubtotal, new Date().toISOString(), originalOrder.id);
        }

        const updatedOriginal = getOrderById(id, db);
        const newCreatedOrder = getOrderById(newOrderId, db);

        return { updatedOrder: updatedOriginal!, newOrder: newCreatedOrder! };
    });

    try {
        // @ts-ignore
        return transaction(orderId, itemsToSplit);
    } finally {
        // No close
    }
}

export async function mergeOrders(fromOrderId: string, toOrderId: string): Promise<Order> {
    const db = getDb();
    const transaction = db.transaction((fromId, toId) => {
        const fromOrder = getOrderById(fromId, db);
        const toOrder = getOrderById(toId, db);

        if (!fromOrder || !toOrder) {
            throw new Error("One or both orders not found");
        }

        // Get existing items in target order
        const toItems = db.prepare('SELECT id, product_id, quantity, item_type FROM order_items WHERE order_id = ?').all(toId) as any[];
        const fromItems = db.prepare('SELECT id, product_id, quantity, price, item_type FROM order_items WHERE order_id = ?').all(fromId) as any[];

        // Consolidate items - combine quantities for same product_id
        for (const fromItem of fromItems) {
            const existingItem = toItems.find(ti => ti.product_id === fromItem.product_id && ti.item_type === fromItem.item_type);
            if (existingItem) {
                // Update quantity in existing item (consolidate)
                db.prepare('UPDATE order_items SET quantity = quantity + ? WHERE id = ?')
                    .run(fromItem.quantity, existingItem.id);
                // Delete the from item
                db.prepare('DELETE FROM order_items WHERE id = ?').run(fromItem.id);
            } else {
                // Move item to target order (no duplicate)
                db.prepare('UPDATE order_items SET order_id = ? WHERE id = ?')
                    .run(toId, fromItem.id);
            }
        }

        // Delete the now-empty 'from' order
        db.prepare('DELETE FROM orders WHERE id = ?').run(fromId);

        // Recalculate subtotal and total for merged order
        const mergedItems = db.prepare('SELECT quantity, price FROM order_items WHERE order_id = ?').all(toId) as any[];
        const subtotal = mergedItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

        // Get current discount and tax to properly calculate total
        const currentOrder = db.prepare('SELECT discount, tax FROM orders WHERE id = ?').get(toId) as any;
        const total = subtotal - (currentOrder?.discount || 0) + (currentOrder?.tax || 0);

        db.prepare('UPDATE orders SET subtotal = ?, total = ?, timestamp = ? WHERE id = ?')
            .run(subtotal, total, new Date().toISOString(), toId);

        return getOrderById(toId, db)!;
    });

    try {
        return transaction(fromOrderId, toOrderId);
    } finally {
        // No close
    }
}

export async function getOrderStats(): Promise<{
    totalOrders: number;
    completedOrders: number;
    canceledOrders: number;
    totalRevenue: number;
    totalSpending: number;
    recentSales: any[];
    topSellingProducts: any[];
}> {
    const db = getDb();
    try {
        // Get total orders
        const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get() as any;

        // Get completed orders
        const completedOrders = db.prepare('SELECT COUNT(*) as count FROM orders WHERE status = ?').get('Completed') as any;

        // Get canceled orders (assuming 'Canceled' status exists, if not we'll use 0)
        const canceledOrders = db.prepare('SELECT COUNT(*) as count FROM orders WHERE status = ?').get('Canceled') as any;

        // Get total revenue from completed orders
        const revenueResult = db.prepare(`
            SELECT SUM(total) as total
            FROM orders
            WHERE status = 'Completed'
        `).get() as any;

        // Get recent sales (last 10 completed orders)
        const recentSales = db.prepare(`
            SELECT 
                o.id,
                o.table_name,
                o.timestamp,
                o.timestamp,
                o.total as total_amount,
                COUNT(oi.id) as item_count
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status = 'Completed'
            GROUP BY o.id
            ORDER BY o.timestamp DESC
            LIMIT 10
        `).all() as any[];

        // Get top selling products
        const topProducts = db.prepare(`
            SELECT 
                p.id,
                p.name,
                p.category,
                p.image,
                SUM(oi.quantity) as total_sold,
                SUM(oi.quantity * oi.price) as total_revenue
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status = 'Completed'
            GROUP BY p.id
            ORDER BY total_sold DESC
            LIMIT 5
        `).all() as any[];

        // For now, set total spending to 0 (this would come from inventory costs)
        const totalSpending = 0;

        return {
            totalOrders: totalOrders.count,
            completedOrders: completedOrders.count,
            canceledOrders: canceledOrders.count || 0,
            totalRevenue: revenueResult.total || 0,
            totalSpending,
            recentSales: recentSales.map(sale => ({
                id: sale.id,
                table: sale.table_name,
                amount: sale.total_amount,
                itemCount: sale.item_count,
                timestamp: new Date(sale.timestamp)
            })),
            topSellingProducts: topProducts.map(product => ({
                id: String(product.id),
                name: product.name,
                category: product.category,
                image: product.image,
                totalSold: product.total_sold,
                totalRevenue: product.total_revenue
            }))
        };
    } finally {
        // No close
    }
}

export async function getTableStats(): Promise<{
    totalTables: number;
    occupiedTables: number;
    availableTables: number;
    activeTables: string;
}> {
    const db = getDb();
    try {
        const totalTables = db.prepare('SELECT COUNT(*) as count FROM tables').get() as any;
        const occupiedTables = db.prepare('SELECT COUNT(*) as count FROM tables WHERE status = ?').get('Occupied') as any;
        const availableTables = db.prepare('SELECT COUNT(*) as count FROM tables WHERE status = ?').get('Available') as any;

        return {
            totalTables: totalTables.count,
            occupiedTables: occupiedTables.count,
            availableTables: availableTables.count,
            activeTables: `${occupiedTables.count} / ${totalTables.count}`
        };
    } finally {
        // No close
    }
}
