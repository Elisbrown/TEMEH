// src/lib/db/inventory.ts
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath =
  process.env.SQLITE_DB_PATH || path.join(process.cwd(), "temeh.db");
let dbInstance: Database.Database | null = null;

function getDb(): Database.Database {
  if (dbInstance && dbInstance.open) {
    return dbInstance;
  }

  const dbExists = fs.existsSync(dbPath);
  const db = new Database(dbPath);

  if (!dbExists) {
    console.log("Database file not found, creating and initializing schema...");
    const schema = fs.readFileSync(
      path.join(process.cwd(), "docs", "database.md"),
      "utf8",
    );
    const sqlOnly = schema.split("```sql")[1].split("```")[0];
    db.exec(sqlOnly);

    // Create inventory tables if they don't exist
    db.exec(`
            CREATE TABLE IF NOT EXISTS inventory_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sku TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                unit TEXT NOT NULL DEFAULT 'pieces',
                unit_type TEXT DEFAULT 'Piece' CHECK(unit_type IN ('Carton', 'Kilo', 'Piece')),
                min_stock_level INTEGER DEFAULT 10,
                max_stock_level INTEGER,
                current_stock REAL NOT NULL DEFAULT 0,
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
        
    // Migration: Add selling_price if not exists
    try {
        const columns = db.prepare("PRAGMA table_info(inventory_items)").all() as any[];
        const hasSellingPrice = columns.some(c => c.name === 'selling_price');
        if (!hasSellingPrice) {
            console.log("Migrating database: adding selling_price column to inventory_items...");
            db.prepare("ALTER TABLE inventory_items ADD COLUMN selling_price REAL DEFAULT 0").run();
        }
    } catch (error) {
        console.error("Migration error:", error);
    }

    console.log("Inventory database schema initialized.");
  }

  dbInstance = db;
  return db;
}

export type InventoryItem = {
  id: number;
  sku: string;
  name: string;
  category: string;
  description?: string;
  unit: string;
  unit_type: 'Carton' | 'Kilo' | 'Piece';
  min_stock_level: number;
  max_stock_level?: number;
  current_stock: number;
  cost_per_unit?: number;
  selling_price?: number;
  supplier_id?: number;
  image?: string;
  expiry_date?: string;
  batch_number?: string;
  created_at: string;
  updated_at: string;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  expiryStatus?: "Fresh" | "Getting Bad" | "Expired";
  supplier?: {
    name: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
};

export type InventoryMovement = {
  id: number;
  item_id: number;
  movement_type: "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER";
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  reference_number?: string;
  reference_type?:
    | "PURCHASE_ORDER"
    | "SALES_ORDER"
    | "ADJUSTMENT"
    | "TRANSFER"
    | "WASTE"
    | "THEFT"
    | "DAMAGE";
  notes?: string;
  user_id?: number;
  movement_date: string;
  item?: {
    name: string;
    sku: string;
  };
  user?: {
    name: string;
    email: string;
  };
};

export type InventoryCategory = {
  id: number;
  name: string;
  description?: string;
  color: string;
  created_at: string;
};

export type InventorySupplier = {
  id: number;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
};

const getStatusForStock = (
  currentStock: number,
  minStockLevel: number,
): "In Stock" | "Low Stock" | "Out of Stock" => {
  if (currentStock <= 0) return "Out of Stock";
  if (currentStock <= minStockLevel) return "Low Stock";
  return "In Stock";
};

/**
 * Calculate expiry status for an inventory item
 * @param expiryDate - ISO date string or null
 * @param warningDays - Days before expiry to show "Getting Bad" (default 7)
 */
const getExpiryStatus = (
  expiryDate: string | null | undefined,
  warningDays: number = 7
): "Fresh" | "Getting Bad" | "Expired" | undefined => {
  if (!expiryDate) return undefined;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return "Expired";
  if (diffDays <= warningDays) return "Getting Bad";
  return "Fresh";
};

export async function getInventoryItems(): Promise<InventoryItem[]> {
  const db = getDb();
  try {
    const rows = db
      .prepare(
        `
            SELECT 
                i.*,
                s.name as supplier_name,
                s.contact_person as supplier_contact_person,
                s.phone as supplier_phone,
                s.email as supplier_email,
                s.address as supplier_address
            FROM inventory_items i
            LEFT JOIN inventory_suppliers s ON i.supplier_id = s.id
            ORDER BY i.name
        `,
      )
      .all() as any[];

    return rows.map((row) => ({
      ...row,
      status: getStatusForStock(row.current_stock, row.min_stock_level),
      expiryStatus: getExpiryStatus(row.expiry_date),
      supplier: row.supplier_id
        ? {
            name: row.supplier_name,
            contact_person: row.supplier_contact_person,
            phone: row.supplier_phone,
            email: row.supplier_email,
            address: row.supplier_address,
          }
        : undefined,
    }));
  } finally {
    // No close
  }
}

export async function getInventoryItemById(
  id: number,
): Promise<InventoryItem | null> {
  const db = getDb();
  try {
    const row = db
      .prepare(
        `
            SELECT 
                i.*,
                s.name as supplier_name,
                s.contact_person as supplier_contact_person,
                s.phone as supplier_phone,
                s.email as supplier_email,
                s.address as supplier_address
            FROM inventory_items i
            LEFT JOIN inventory_suppliers s ON i.supplier_id = s.id
            WHERE i.id = ?
        `,
      )
      .get(id) as any;

    if (!row) return null;

    return {
      ...row,
      status: getStatusForStock(row.current_stock, row.min_stock_level),
      expiryStatus: getExpiryStatus(row.expiry_date),
      supplier: row.supplier_id
        ? {
            name: row.supplier_name,
            contact_person: row.supplier_contact_person,
            phone: row.supplier_phone,
            email: row.supplier_email,
            address: row.supplier_address,
          }
        : undefined,
    };
  } finally {
    // No close
  }
}

/**
 * Get items that are expiring soon or already expired
 * @param warningDays - Days threshold for "Getting Bad" status (default 7)
 */
export async function getExpiringItems(warningDays: number = 7): Promise<InventoryItem[]> {
  const db = getDb();
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + warningDays);
  const warningDateStr = warningDate.toISOString().split('T')[0];
  
  const rows = db.prepare(`
    SELECT i.*, 
      s.name as supplier_name,
      s.contact_person as supplier_contact_person,
      s.phone as supplier_phone,
      s.email as supplier_email,
      s.address as supplier_address
    FROM inventory_items i
    LEFT JOIN inventory_suppliers s ON i.supplier_id = s.id
    WHERE i.expiry_date IS NOT NULL 
      AND DATE(i.expiry_date) <= DATE(?)
      AND i.current_stock > 0
    ORDER BY i.expiry_date ASC
  `).all(warningDateStr) as any[];
  
  return rows.map((row) => ({
    ...row,
    status: getStatusForStock(row.current_stock, row.min_stock_level),
    expiryStatus: getExpiryStatus(row.expiry_date, warningDays),
    supplier: row.supplier_id ? {
      name: row.supplier_name,
      contact_person: row.supplier_contact_person,
      phone: row.supplier_phone,
      email: row.supplier_email,
      address: row.supplier_address,
    } : undefined,
  }));
}

/**
 * Get items sorted by FIFO (First In, First Out) priority
 * Items with earliest expiry_date or oldest batch_number come first
 */
export async function getItemsByFIFO(): Promise<InventoryItem[]> {
  const db = getDb();
  
  const rows = db.prepare(`
    SELECT i.*, 
      s.name as supplier_name,
      s.contact_person as supplier_contact_person,
      s.phone as supplier_phone,
      s.email as supplier_email,
      s.address as supplier_address
    FROM inventory_items i
    LEFT JOIN inventory_suppliers s ON i.supplier_id = s.id
    WHERE i.current_stock > 0
    ORDER BY 
      CASE WHEN i.expiry_date IS NOT NULL THEN 0 ELSE 1 END,
      i.expiry_date ASC,
      i.batch_number ASC,
      i.created_at ASC
  `).all() as any[];
  
  return rows.map((row) => ({
    ...row,
    status: getStatusForStock(row.current_stock, row.min_stock_level),
    expiryStatus: getExpiryStatus(row.expiry_date),
    supplier: row.supplier_id ? {
      name: row.supplier_name,
      contact_person: row.supplier_contact_person,
      phone: row.supplier_phone,
      email: row.supplier_email,
      address: row.supplier_address,
    } : undefined,
  }));
}

export async function addInventoryItem(
  itemData: Omit<
    InventoryItem,
    "id" | "created_at" | "updated_at" | "status" | "supplier"
  >,
): Promise<InventoryItem> {
  const db = getDb();
  try {
    const transaction = db.transaction((data) => {
      const stmt = db.prepare(`
                INSERT INTO inventory_items (
                    sku, name, category, description, unit, min_stock_level, 
                    max_stock_level, current_stock, cost_per_unit, selling_price, supplier_id, image, expiry_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

      const result = stmt.run(
        data.sku,
        data.name,
        data.category,
        data.description || null,
        data.unit,
        data.min_stock_level,
        data.max_stock_level || null,
        data.current_stock,
        data.cost_per_unit || null,
        data.selling_price || 0,
        data.supplier_id || null,
        data.image || null,
        data.expiry_date || null
      );

      return result.lastInsertRowid as number;
    });

    const newId = transaction(itemData);
    return (await getInventoryItemById(newId)) as InventoryItem;
  } finally {
    // No close
  }
}

export async function bulkAddInventoryItems(
  itemsData: Omit<
    InventoryItem,
    "id" | "created_at" | "updated_at" | "status" | "supplier"
  >[],
): Promise<void> {
  const db = getDb();
  try {
    const transaction = db.transaction((items) => {
      const stmt = db.prepare(`
                INSERT INTO inventory_items (
                    sku, name, category, description, unit, min_stock_level, 
                    max_stock_level, current_stock, cost_per_unit, selling_price, supplier_id, image, expiry_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

      for (const data of items) {
        stmt.run(
          data.sku,
          data.name,
          data.category,
          data.description || null,
          data.unit,
          data.min_stock_level,
          data.max_stock_level || null,
          data.current_stock,
          data.cost_per_unit || null,
          data.selling_price || 0,
          data.supplier_id || null,
          data.image || null,
          data.expiry_date || null
        );
      }
    });

    transaction(itemsData);
  } finally {
    // No close
  }
}

export async function updateInventoryItem(
  id: number,
  itemData: Partial<InventoryItem>,
): Promise<InventoryItem> {
  const db = getDb();
  try {
    const transaction = db.transaction((itemId, data) => {
      const fields = Object.keys(data).filter(
        (key) =>
          key !== "id" &&
          key !== "created_at" &&
          key !== "updated_at" &&
          key !== "status" &&
          key !== "supplier" &&
          key !== "userEmail" &&
          key !== "userId",
      );
      const setClause = fields.map((field) => `${field} = ?`).join(", ");
      const values = fields.map((field) => (data as any)[field]);

      const stmt = db.prepare(
        `UPDATE inventory_items SET ${setClause}, updated_at = ? WHERE id = ?`,
      );
      stmt.run(...values, new Date().toISOString(), itemId);

      return itemId;
    });

    transaction(id, itemData);
    return (await getInventoryItemById(id)) as InventoryItem;
  } finally {
    // No close
  }
}

export async function deleteInventoryItem(id: number): Promise<void> {
  const db = getDb();
  try {
    const transaction = db.transaction((itemId) => {
      // Delete related movements first
      db.prepare("DELETE FROM inventory_movements WHERE item_id = ?").run(
        itemId,
      );
      // Delete the item
      db.prepare("DELETE FROM inventory_items WHERE id = ?").run(itemId);
    });

    transaction(id);
  } finally {
    // No close
  }
}

export async function addInventoryMovement(
  movementData: Omit<
    InventoryMovement,
    "id" | "movement_date" | "item" | "user"
  >,
): Promise<InventoryMovement> {
  const db = getDb();
  try {
    const transaction = db.transaction((data) => {
      // Calculate total cost if unit cost is provided
      const totalCost = data.unit_cost ? data.unit_cost * data.quantity : null;

      // Insert movement record
      const movementStmt = db.prepare(`
                INSERT INTO inventory_movements (
                    item_id, movement_type, quantity, unit_cost, total_cost,
                    reference_number, reference_type, notes, user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

      const movementResult = movementStmt.run(
        data.item_id,
        data.movement_type,
        data.quantity,
        data.unit_cost || null,
        totalCost,
        data.reference_number || null,
        data.reference_type || null,
        data.notes || null,
        data.user_id || null,
      );

      // Update item stock with rounding to 3 decimal places to avoid floating point issues
      const stockChange =
        data.movement_type === "IN" ? data.quantity : -data.quantity;
      const itemStmt = db.prepare(
        "UPDATE inventory_items SET current_stock = ROUND(current_stock + ?, 3), updated_at = ? WHERE id = ?",
      );
      itemStmt.run(stockChange, new Date().toISOString(), data.item_id);

      return movementResult.lastInsertRowid as number;
    });

    const newMovementId = transaction(movementData);
    return (await getInventoryMovementById(newMovementId)) as InventoryMovement;
  } finally {
    // No close
  }
}

export async function bulkAddInventoryMovements(
  movementsData: Omit<
    InventoryMovement,
    "id" | "movement_date" | "item" | "user"
  >[],
): Promise<void> {
  const db = getDb();
  try {
    const transaction = db.transaction((movements) => {
      const movementStmt = db.prepare(`
                INSERT INTO inventory_movements (
                    item_id, movement_type, quantity, unit_cost, total_cost,
                    reference_number, reference_type, notes, user_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

      const itemStmt = db.prepare(
        "UPDATE inventory_items SET current_stock = ROUND(current_stock + ?, 3), updated_at = ? WHERE id = ?",
      );
      const now = new Date().toISOString();

      for (const data of movements) {
        const totalCost = data.unit_cost
          ? data.unit_cost * data.quantity
          : null;

        movementStmt.run(
          data.item_id,
          data.movement_type,
          data.quantity,
          data.unit_cost || null,
          totalCost,
          data.reference_number || null,
          data.reference_type || null,
          data.notes || null,
          data.user_id || null,
        );

        const stockChange =
          data.movement_type === "IN" ? data.quantity : -data.quantity;
        itemStmt.run(stockChange, now, data.item_id);
      }
    });

    transaction(movementsData);
  } finally {
    // No close
  }
}

export async function getInventoryMovements(
  itemId?: number,
  limit: number = 100,
): Promise<InventoryMovement[]> {
  const db = getDb();
  try {
    let query = `
            SELECT 
                m.*,
                i.name as item_name,
                i.sku as item_sku,
                u.name as user_name,
                u.email as user_email
            FROM inventory_movements m
            LEFT JOIN inventory_items i ON m.item_id = i.id
            LEFT JOIN users u ON m.user_id = u.id
        `;

    const params: any[] = [];
    if (itemId) {
      query += " WHERE m.item_id = ?";
      params.push(itemId);
    }

    query += " ORDER BY m.movement_date DESC LIMIT ?";
    params.push(limit);

    const rows = db.prepare(query).all(...params) as any[];

    return rows.map((row) => ({
      ...row,
      item: {
        name: row.item_name,
        sku: row.item_sku,
      },
      user: row.user_id
        ? {
            name: row.user_name,
            email: row.user_email,
          }
        : undefined,
    }));
  } finally {
    // No close
  }
}

export async function getInventoryMovementsByDate(
  startDate: string,
  endDate: string,
): Promise<InventoryMovement[]> {
  const db = getDb();
  try {
    const rows = db
      .prepare(
        `
            SELECT 
                m.*,
                i.name as item_name,
                i.sku as item_sku,
                u.name as user_name,
                u.email as user_email
            FROM inventory_movements m
            LEFT JOIN inventory_items i ON m.item_id = i.id
            LEFT JOIN users u ON m.user_id = u.id
            WHERE DATE(m.movement_date) >= DATE(?) AND DATE(m.movement_date) <= DATE(?)
            ORDER BY m.movement_date DESC
        `,
      )
      .all(startDate, endDate) as any[];

    return rows.map((row) => ({
      ...row,
      item: {
        name: row.item_name,
        sku: row.item_sku,
      },
      user: row.user_id
        ? {
            name: row.user_name,
            email: row.user_email,
          }
        : undefined,
    }));
  } finally {
    // No close
  }
}

export async function getInventoryMovementById(
  id: number,
): Promise<InventoryMovement | null> {
  const db = getDb();
  try {
    const row = db
      .prepare(
        `
            SELECT 
                m.*,
                i.name as item_name,
                i.sku as item_sku,
                u.name as user_name,
                u.email as user_email
            FROM inventory_movements m
            LEFT JOIN inventory_items i ON m.item_id = i.id
            LEFT JOIN users u ON m.user_id = u.id
            WHERE m.id = ?
        `,
      )
      .get(id) as any;

    if (!row) return null;

    return {
      ...row,
      item: {
        name: row.item_name,
        sku: row.item_sku,
      },
      user: row.user_id
        ? {
            name: row.user_name,
            email: row.user_email,
          }
        : undefined,
    };
  } finally {
    // No close
  }
}

export async function getInventoryCategories(): Promise<InventoryCategory[]> {
  const db = getDb();
  try {
    return db
      .prepare("SELECT * FROM inventory_categories ORDER BY name")
      .all() as InventoryCategory[];
  } finally {
    // No close
  }
}

export async function addInventoryCategory(
  categoryData: Omit<InventoryCategory, "id" | "created_at">,
): Promise<InventoryCategory> {
  const db = getDb();
  try {
    const stmt = db.prepare(
      "INSERT INTO inventory_categories (name, description, color) VALUES (?, ?, ?)",
    );
    const result = stmt.run(
      categoryData.name,
      categoryData.description || null,
      categoryData.color,
    );

    return {
      id: result.lastInsertRowid as number,
      ...categoryData,
      created_at: new Date().toISOString(),
    };
  } finally {
    // No close
  }
}

export async function getInventorySuppliers(): Promise<InventorySupplier[]> {
  const db = getDb();
  try {
    return db
      .prepare("SELECT * FROM inventory_suppliers ORDER BY name")
      .all() as InventorySupplier[];
  } finally {
    // No close
  }
}

export async function getInventorySupplierById(
  id: number,
): Promise<InventorySupplier | null> {
  const db = getDb();
  try {
    const supplier = db
      .prepare("SELECT * FROM inventory_suppliers WHERE id = ?")
      .get(id) as InventorySupplier | undefined;
    return supplier || null;
  } finally {
    // No close
  }
}

export async function addInventorySupplier(
  supplierData: Omit<InventorySupplier, "id" | "created_at">,
): Promise<InventorySupplier> {
  const db = getDb();
  try {
    const stmt = db.prepare(`
            INSERT INTO inventory_suppliers (name, contact_person, phone, email, address) 
            VALUES (?, ?, ?, ?, ?)
        `);
    const result = stmt.run(
      supplierData.name,
      supplierData.contact_person || null,
      supplierData.phone || null,
      supplierData.email || null,
      supplierData.address || null,
    );

    return {
      id: result.lastInsertRowid as number,
      ...supplierData,
      created_at: new Date().toISOString(),
    };
  } finally {
    // No close
  }
}

export async function updateInventorySupplier(
  supplierData: InventorySupplier,
): Promise<InventorySupplier> {
  const db = getDb();
  try {
    const stmt = db.prepare(`
            UPDATE inventory_suppliers 
            SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?
            WHERE id = ?
        `);
    stmt.run(
      supplierData.name,
      supplierData.contact_person || null,
      supplierData.phone || null,
      supplierData.email || null,
      supplierData.address || null,
      supplierData.id,
    );

    return supplierData;
  } finally {
    // No close
  }
}

export async function deleteInventorySupplier(
  supplierId: number,
): Promise<void> {
  const db = getDb();
  try {
    const stmt = db.prepare("DELETE FROM inventory_suppliers WHERE id = ?");
    stmt.run(supplierId);
  } finally {
    // No close
  }
}

export async function getInventoryStats(): Promise<{
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: number;
  recentMovements: number;
}> {
  const db = getDb();
  try {
    const totalItems = db
      .prepare("SELECT COUNT(*) as count FROM inventory_items")
      .get() as any;
    const lowStockItems = db
      .prepare(
        "SELECT COUNT(*) as count FROM inventory_items WHERE current_stock < min_stock_level AND current_stock > 0",
      )
      .get() as any;
    const outOfStockItems = db
      .prepare(
        "SELECT COUNT(*) as count FROM inventory_items WHERE current_stock <= 0",
      )
      .get() as any;
    const totalValue = db
      .prepare(
        "SELECT SUM(current_stock * COALESCE(cost_per_unit, 0)) as total FROM inventory_items",
      )
      .get() as any;
    const recentMovements = db
      .prepare(
        "SELECT COUNT(*) as count FROM inventory_movements WHERE movement_date >= datetime('now', '-7 days')",
      )
      .get() as any;

    return {
      totalItems: totalItems.count,
      lowStockItems: lowStockItems.count,
      outOfStockItems: outOfStockItems.count,
      totalValue: totalValue.total || 0,
      recentMovements: recentMovements.count,
    };
  } finally {
    // No close
  }
}
