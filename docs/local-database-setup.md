# Guide: Implementing Local Database Persistence

This document provides a step-by-step guide to transition the application from its current mock data layer (using browser `localStorage`) to a persistent SQLite database running on your local machine. This will enable true data persistence that is not tied to a single browser session.

## Prerequisites

-   **Node.js and npm**: Ensure you have Node.js and npm installed on your system.
-   **SQLite Client (Recommended)**: A visual tool like [DB Browser for SQLite](https://sqlitebrowser.org/) is highly recommended for creating the database file and running SQL queries, but you can also use the command-line `sqlite3` tool.

---

## Step 1: Install Dependencies

If you haven't already, open a terminal in the project's root directory and run the installation command. This will install all necessary packages, including `better-sqlite3`, the driver used to communicate with the SQLite database.

```bash
npm install
```

---

## Step 2: Create and Prepare the Database

1.  **Create the Database File**: In the root directory of the project, create an empty file named `loungeos.db`.

2.  **Initialize the Schema**: Run the following command to automatically create all tables:

    ```bash
    npm run db:init
    ```

    This will execute the schema from `scripts/init-db.ts` and set up all required tables. You do NOT need to manually run SQL for schema creation.

3.  **Seed the Database**: Run the seed script to populate the `users` table with default accounts for each role:

    ```bash
    npm run db:seed
    ```

    After this step, your `loungeos.db` file will contain all the required tables and a set of default users.

---

## Step 3: Implement the Data Access Layer

This is the most critical step. You will now replace the mock data functions in the `src/lib/db/` directory with functions that perform real database queries.

The project is structured to make this straightforward. Each file in `src/lib/db/` (e.g., `products.ts`, `staff.ts`) corresponds to a database table. You will edit these files to connect to `loungeos.db`.

### Example: Connecting `products.ts`

Here’s how you would modify `src/lib/db/products.ts` to use the real database.

1.  **Open the file**: `src/lib/db/products.ts`

2.  **Import the driver and initialize the database connection** at the top of the file.

    ```typescript
    import Database from 'better-sqlite3';

    // This connects to the loungeos.db file in the project root
    const db = new Database('loungeos.db', { fileMustExist: true });
    ```

3.  **Replace the mock functions** with database query functions.

    **Before (Mock Implementation):**
    ```typescript
    // src/lib/db/products.ts (Original Mock)
    import { getStorageData, setStorageData } from '@/lib/storage';
    import type { Meal } from '@/context/product-context';

    export async function getMeals(): Promise<Meal[]> {
      const data = getStorageData();
      return Promise.resolve(data.meals);
    }
    // ...other mock functions
    ```

    **After (Database Implementation):**
    ```typescript
    // src/lib/db/products.ts (New Database Logic)
    import Database from 'better-sqlite3';
    import type { Meal } from '@/context/product-context';

    const db = new Database('loungeos.db', { fileMustExist: true });

    export async function getMeals(): Promise<Meal[]> {
      const stmt = db.prepare('SELECT * FROM products');
      const meals = stmt.all() as Meal[]; // Cast the result to the Meal type
      return meals;
    }

    export async function addMeal(mealData: Omit<Meal, 'id'>): Promise<Meal> {
      const stmt = db.prepare(
        'INSERT INTO products (name, price, category, image, quantity) VALUES (?, ?, ?, ?, ?)'
      );
      const info = stmt.run(mealData.name, mealData.price, mealData.category, mealData.image, mealData.quantity);

      // Retrieve the newly created meal to get its ID
      const newMeal = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid) as Meal;
      return newMeal;
    }

    export async function updateMeal(updatedMeal: Meal): Promise<Meal> {
      const stmt = db.prepare(
        'UPDATE products SET name = ?, price = ?, category = ?, image = ?, quantity = ? WHERE id = ?'
      );
      stmt.run(updatedMeal.name, updatedMeal.price, updatedMeal.category, updatedMeal.image, updatedMeal.quantity, updatedMeal.id);
      return updatedMeal;
    }

    export async function deleteMeal(mealId: string): Promise<{ id: string }> {
      const stmt = db.prepare('DELETE FROM products WHERE id = ?');
      stmt.run(mealId);
      return { id: mealId };
    }
    ```

### Next Steps

Apply the same pattern to the other files in the `src/lib/db/` directory:

-   `categories.ts`
-   `floors.ts`
-   `ingredients.ts`
-   `orders.ts`
-   `staff.ts`
-   `suppliers.ts`
-   `tables.ts`
-   `tickets.ts`

For each file, import `better-sqlite3`, establish the `db` connection, and rewrite each function to execute the appropriate SQL query (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) against the corresponding table.

---

## Step 4: Run the Application

Once you have updated the data access layer files, run the development server:

```bash
npm run dev
```

The application will now be running with a fully persistent local database. Any changes you make—adding a meal, creating a user, placing an order—will be saved directly to the `loungeos.db` file and will be present the next time you start the app.
