# Database Setup & Schema

LoungeOS is designed to work with an SQLite database for local deployments. This document provides the schema and instructions for setting it up.

## Setup

1.  **Install Driver**: Ensure you have run `npm install`. This installs `better-sqlite3`, the driver used to communicate with the database.
2.  **Create Database File**: In the root of the project, create an empty file named `temeh.db`.
3.  **Create Tables**: Use an SQLite client or a script to execute the SQL commands below to create the necessary tables in your `temeh.db` file.
4.  **Seed Database**: Run `npm run db:seed` to populate the `users` table with default accounts.

## Schema

Here is the complete SQL schema for the application.

```sql
-- Users Table (for staff)
-- Stores login information and roles for all staff members.
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN (
        'Super Admin', 'Manager', 'Accountant', 'Cashier'
    )),
    status TEXT DEFAULT 'Active' CHECK(status IN ('Active', 'Away', 'Inactive')),
    avatar TEXT,
    floor TEXT,
    phone TEXT,
    hire_date DATE,
    force_password_change INTEGER DEFAULT 1,
    emergency_contact_name TEXT,
    emergency_contact_relationship TEXT,
    emergency_contact_phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Settings Table
-- Stores per-user dashboard layout and preferences.
CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    dashboard_layout TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id)
);

-- Products/Meals Table
-- Stores all sellable items, including meals and drinks.
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    image TEXT,
    quantity INTEGER NOT NULL
);

-- Categories Table
-- Stores categories for products to aid in organization on the POS.
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    is_food BOOLEAN NOT NULL DEFAULT 1
);

-- Orders Table
-- Stores a record of every order placed.
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    table_name TEXT,
    status TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    subtotal REAL NOT NULL,
    discount REAL DEFAULT 0,
    discount_name TEXT,
    tax REAL DEFAULT 0,
    total REAL NOT NULL,
    cashier_id INTEGER,
    cancelled_by INTEGER,
    cancellation_reason TEXT,
    cancelled_at DATETIME,
    payment_method TEXT,
    FOREIGN KEY (cashier_id) REFERENCES users(id)
);

-- Order Items Table
-- A junction table linking orders to the products they contain.
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Saved Orders (Held Carts) Table
-- Stores orders that have been saved for later.
CREATE TABLE IF NOT EXISTS saved_orders (
    id TEXT PRIMARY KEY,
    name TEXT,
    items TEXT NOT NULL, -- JSON string of items
    total REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    saved_by INTEGER,
    FOREIGN KEY (saved_by) REFERENCES users(id)
);

-- Payments Table
-- Records every payment processed through the system.
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    cashier_id INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (cashier_id) REFERENCES users(id)
);

-- Floors Table
-- Stores the names of different service areas.
CREATE TABLE IF NOT EXISTS floors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

-- Tables Table
-- Stores tables and their assignment to floors.
CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    capacity INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Available' CHECK(status IN ('Available', 'Occupied', 'Reserved')),
    floor_id INTEGER,
    FOREIGN KEY (floor_id) REFERENCES floors(id)
);

-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT
);

-- Tickets Table
-- For internal support and maintenance requests.
CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK(priority IN ('Low', 'Medium', 'High', 'Urgent')),
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
    creator_id INTEGER NOT NULL,
    assignee_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id),
    FOREIGN KEY (assignee_id) REFERENCES users(id)
);

-- Ticket Comments Table
-- Stores comments on tickets.
CREATE TABLE IF NOT EXISTS ticket_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Activity Log Table
-- For auditing significant user actions.
CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    entity_id TEXT,
    metadata TEXT, -- JSON string for additional context
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Settings Table
-- Stores application configuration settings.
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notes Table
-- Stores user notes.
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT,
    user_id INTEGER,
    is_pinned BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Events Table
-- Stores scheduled events.
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    location TEXT,
    capacity INTEGER,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
-- Stores system notifications.
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'unread',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Backups Table
CREATE TABLE IF NOT EXISTS backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'manual',
    status TEXT DEFAULT 'completed',
    created_by TEXT
);

-- Backup Settings Table
CREATE TABLE IF NOT EXISTS backup_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    frequency TEXT DEFAULT 'daily',
    last_backup TEXT,
    next_backup TEXT,
    enabled INTEGER DEFAULT 0
);

-- Inventory Items Table
-- Stores raw materials and ingredients for inventory management.
CREATE TABLE IF NOT EXISTS inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    unit TEXT NOT NULL DEFAULT 'pieces',
    unit_type TEXT DEFAULT 'Piece' CHECK(unit_type IN ('Carton', 'Kilo', 'Piece', 'KG', 'Litre')),
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

-- Inventory Movements Table
-- Tracks all stock movements (in, out, adjustments, transfers).
CREATE TABLE IF NOT EXISTS inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    movement_type TEXT NOT NULL CHECK(movement_type IN ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER')),
    quantity REAL NOT NULL,
    unit_cost REAL,
    total_cost REAL,
    reference_number TEXT,
    reference_type TEXT,
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
    parent_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES inventory_categories(id)
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

-- Chart of Accounts Table
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    parent_code TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Journal Entries Table
CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_date DATE NOT NULL,
    entry_type TEXT NOT NULL,
    description TEXT,
    reference TEXT,
    total_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'draft',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Journal Entry Lines Table
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journal_entry_id INTEGER NOT NULL,
    account_code TEXT NOT NULL,
    account_name TEXT NOT NULL,
    description TEXT,
    debit REAL DEFAULT 0,
    credit REAL DEFAULT 0,
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    payment_method TEXT,
    receipt_number TEXT,
    vendor TEXT,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Expense Categories Table
CREATE TABLE IF NOT EXISTS expense_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#6b7280',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payroll Salaries Table
CREATE TABLE IF NOT EXISTS payroll_salaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    base_salary REAL NOT NULL,
    effective_date DATE NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES users(id)
);

-- Payroll Advances Table
CREATE TABLE IF NOT EXISTS payroll_advances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    reason TEXT,
    date DATE NOT NULL,
    approved_by INTEGER,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'repaid')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Payroll Payouts Table
CREATE TABLE IF NOT EXISTS payroll_payouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    deductions REAL DEFAULT 0,
    bonuses REAL DEFAULT 0,
    net_amount REAL NOT NULL,
    payment_method TEXT,
    payment_date DATE NOT NULL,
    notes TEXT,
    processed_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES users(id),
    FOREIGN KEY (processed_by) REFERENCES users(id)
);
```

## Data Layer Implementation

The project contains a `src/lib/db` directory with files that abstract data operations. Each file uses `better-sqlite3` directly to query the SQLite database.

**Example: `src/lib/db/products.ts`**

```typescript
import Database from "better-sqlite3";
const db = new Database("temeh.db");

export async function getMeals() {
  const stmt = db.prepare("SELECT * FROM products");
  return stmt.all();
}
```
