
// src/lib/db/products.ts
import Database from 'better-sqlite3';
import path from 'path';
import type { Meal } from '@/context/product-context';
import fs from 'fs';

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db');
let dbInstance: Database.Database | null = null;

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

export async function getMealById(id: string): Promise<Meal | null> {
  const db = getDb();
  try {
    const stmt = db.prepare('SELECT id, name, price, category, image, quantity FROM products WHERE id = ?');
    const meal = stmt.get(id) as any;
    if (!meal) return null;
    return {
      ...meal,
      id: String(meal.id)
    };
  } finally {
    // No close
  }
}

export async function getMeals(): Promise<Meal[]> {
  const db = getDb();
  try {
    const stmt = db.prepare('SELECT id, name, price, category, image, quantity FROM products');
    const meals = stmt.all() as any[];
    return meals.map(meal => ({
      ...meal,
      id: String(meal.id) // Ensure id is a string
    }));
  } finally {
    // No close
  }
}

export async function addMeal(mealData: Omit<Meal, 'id'>): Promise<Meal> {
  const db = getDb();
  try {
    const stmt = db.prepare('INSERT INTO products (name, price, category, image, quantity) VALUES (@name, @price, @category, @image, @quantity)');
    const info = stmt.run({
      name: mealData.name,
      price: mealData.price,
      category: mealData.category,
      image: mealData.image || 'https://placehold.co/150x150.png',
      quantity: mealData.quantity
    });
    return {
      id: String(info.lastInsertRowid),
      ...mealData
    };
  } finally {
    // No close
  }
}

export async function updateMeal(updatedMeal: Meal): Promise<Meal> {
  const db = getDb();
  try {
    const stmt = db.prepare('UPDATE products SET name = @name, price = @price, category = @category, image = @image, quantity = @quantity WHERE id = @id');
    stmt.run({
      name: updatedMeal.name,
      price: updatedMeal.price,
      category: updatedMeal.category,
      image: updatedMeal.image,
      quantity: updatedMeal.quantity,
      id: updatedMeal.id
    });
    return updatedMeal;
  } finally {
    // No close
  }
}

export async function deleteMeal(mealId: string): Promise<{ id: string }> {
  const db = getDb();
  try {
    const stmt = db.prepare('DELETE FROM products WHERE id = ?');
    stmt.run(mealId);
    return { id: mealId };
  } finally {
    // No close
  }
}

// New function to get unified products (food + drinks + packaging)
export async function getUnifiedProducts(): Promise<Meal[]> {
  const db = getDb();
  try {
    // Get food items from products table
    const foodStmt = db.prepare('SELECT id, name, price, category, image, quantity FROM products');
    const foodItems = foodStmt.all() as any[];

    // Get drink items from inventory_items table (beverages)
    const drinkStmt = db.prepare(`
      SELECT 
        'inv_' || id as id, 
        name, 
        COALESCE(selling_price, cost_per_unit, 1000) as price, 
        category, 
        image, 
        current_stock as quantity
      FROM inventory_items 
      WHERE category LIKE '%Beverage%' OR category LIKE '%Drink%' OR category LIKE '%Beer%' OR category LIKE '%Wine%'
    `);
    const drinkItems = drinkStmt.all() as any[];

    // Get packaging items from inventory_items table
    const packagingStmt = db.prepare(`
      SELECT 
        'inv_' || id as id, 
        name, 
        COALESCE(selling_price, cost_per_unit, 100) as price, 
        category, 
        image, 
        current_stock as quantity
      FROM inventory_items 
      WHERE category LIKE '%Packaging%' OR category LIKE '%Paper%' OR category LIKE '%Container%' 
         OR category LIKE '%Bag%' OR category LIKE '%Box%' OR category LIKE '%Wrapper%' 
         OR category LIKE '%Plastic%' OR category LIKE '%Foil%' OR category LIKE '%Straw%' 
         OR category LIKE '%Cup%' OR category LIKE '%Plate%' OR category LIKE '%Bowl%' 
         OR category LIKE '%Utensil%' OR category LIKE '%Napkin%' OR category LIKE '%Tissue%'
    `);
    const packagingItems = packagingStmt.all() as any[];

    // Combine and format all items
    const allItems = [...foodItems, ...drinkItems, ...packagingItems].map(item => ({
      ...item,
      id: String(item.id), // Ensure id is a string
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 0
    }));

    return allItems;
  } finally {
    // No close
  }
}

// Function to update inventory stock when drinks are sold
export async function updateInventoryStockForSale(inventoryId: string, quantitySold: number): Promise<void> {
  const db = getDb();
  try {
    // Extract the actual inventory ID (remove 'inv_' prefix)
    const actualId = inventoryId.replace('inv_', '');

    const stmt = db.prepare('UPDATE inventory_items SET current_stock = current_stock - ? WHERE id = ?');
    stmt.run(quantitySold, actualId);
  } finally {
    // No close
  }
}
