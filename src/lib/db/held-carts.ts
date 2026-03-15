// src/lib/db/held-carts.ts
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db');
let dbInstance: Database.Database | null = null;

function getDb(): Database.Database {
    if (dbInstance && dbInstance.open) {
        return dbInstance;
    }

    const resolvedPath = path.resolve(dbPath);
    console.log(`[DB/HeldCarts] Using database at: ${resolvedPath}`);
    const db = new Database(resolvedPath);

    // Create held_carts table if it doesn't exist
    db.exec(`
        CREATE TABLE IF NOT EXISTS held_carts (
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

    dbInstance = db;
    return db;
}

export type HeldCartItem = {
    id: number;
    name: string;
    price: number;
    quantity: number;
    unit_type?: 'Carton' | 'Kilo' | 'Piece';
    notes?: string;
};

export type HeldCart = {
    id: number;
    cart_name?: string;
    customer_name?: string;
    customer_phone?: string;
    items: HeldCartItem[];
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total: number;
    notes?: string;
    user_id?: number;
    created_at: string;
    expires_at?: string;
    user?: {
        name: string;
        email: string;
    };
};

// Get all held carts
export async function getHeldCarts(): Promise<HeldCart[]> {
    const db = getDb();
    const rows = db.prepare(`
        SELECT h.*, u.name as user_name, u.email as user_email
        FROM held_carts h
        LEFT JOIN users u ON h.user_id = u.id
        ORDER BY h.created_at DESC
    `).all() as any[];

    return rows.map(row => ({
        ...row,
        items: JSON.parse(row.items),
        user: row.user_name ? { name: row.user_name, email: row.user_email } : undefined
    }));
}

// Get held cart by ID
export async function getHeldCartById(id: number): Promise<HeldCart | null> {
    const db = getDb();
    const row = db.prepare(`
        SELECT h.*, u.name as user_name, u.email as user_email
        FROM held_carts h
        LEFT JOIN users u ON h.user_id = u.id
        WHERE h.id = ?
    `).get(id) as any;

    if (!row) return null;

    return {
        ...row,
        items: JSON.parse(row.items),
        user: row.user_name ? { name: row.user_name, email: row.user_email } : undefined
    };
}

// Hold a cart
export async function holdCart(data: Omit<HeldCart, 'id' | 'created_at' | 'user'>): Promise<HeldCart> {
    const db = getDb();
    const stmt = db.prepare(`
        INSERT INTO held_carts (cart_name, customer_name, customer_phone, items, subtotal, tax_amount, discount_amount, total, notes, user_id, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
        data.cart_name || null,
        data.customer_name || null,
        data.customer_phone || null,
        JSON.stringify(data.items),
        data.subtotal,
        data.tax_amount,
        data.discount_amount,
        data.total,
        data.notes || null,
        data.user_id || null,
        data.expires_at || null
    );
    
    return await getHeldCartById(result.lastInsertRowid as number) as HeldCart;
}

// Resume (delete) a held cart
export async function resumeCart(id: number): Promise<HeldCart | null> {
    const cart = await getHeldCartById(id);
    if (!cart) return null;
    
    const db = getDb();
    db.prepare('DELETE FROM held_carts WHERE id = ?').run(id);
    
    return cart;
}

// Delete a held cart without returning it
export async function deleteHeldCart(id: number): Promise<any> {
    const db = getDb();
    const result = db.prepare('DELETE FROM held_carts WHERE id = ?').run(id);
    console.log(`[DB/HeldCarts] Deleted cart ${id}. Changes: ${result.changes}`);
    return result;
}

// Get count of held carts for a user
export async function getHeldCartCount(userId?: number): Promise<number> {
    const db = getDb();
    let query = 'SELECT COUNT(*) as count FROM held_carts';
    const params: any[] = [];
    
    if (userId) {
        query += ' WHERE user_id = ?';
        params.push(userId);
    }
    
    const result = db.prepare(query).get(...params) as any;
    return result?.count || 0;
}

// Clean up expired carts
export async function cleanupExpiredCarts(): Promise<number> {
    const db = getDb();
    const result = db.prepare(`
        DELETE FROM held_carts 
        WHERE expires_at IS NOT NULL AND DATETIME(expires_at) < DATETIME('now')
    `).run();
    
    return result.changes;
}
