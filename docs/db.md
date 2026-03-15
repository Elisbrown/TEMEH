-- Users Table (for staff)
-- Stores login information and roles for all staff members.
CREATE TABLE IF NOT EXISTS users (
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT NOT NULL,
email TEXT NOT NULL UNIQUE,
password TEXT NOT NULL,
role TEXT NOT NULL CHECK(role IN ('Super Admin', 'Manager', 'Accountant', 'Stock Manager', 'Chef', 'Waiter', 'Cashier', 'Bartender')),
status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Away')),
avatar TEXT,
floor TEXT,
phone TEXT,
hire_date DATE,
force_password_change INTEGER DEFAULT 1
);

-- Products/Meals Table
-- Stores all sellable items, including meals and drinks.
CREATE TABLE IF NOT EXISTS products (
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT NOT NULL,
price REAL NOT NULL,
category TEXT NOT NULL,
image TEXT, -- Path to the image file, e.g., /uploads/meals/beef-burger.png
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
id TEXT PRIMARY KEY, -- e.g., ORD-XYZ123
table_name TEXT NOT NULL,
status TEXT NOT NULL CHECK(status IN ('Pending', 'In Progress', 'Ready', 'Completed')),
timestamp DATETIME NOT NULL
);

-- Order Items Table
-- A junction table linking orders to the products they contain.
CREATE TABLE IF NOT EXISTS order_items (
id INTEGER PRIMARY KEY AUTOINCREMENT,
order_id TEXT NOT NULL,
product_id INTEGER NOT NULL,
quantity INTEGER NOT NULL,
price REAL NOT NULL, -- Price at the time of order
FOREIGN KEY (order_id) REFERENCES orders(id),
FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Payments Table
-- Records every payment processed through the system.
CREATE TABLE IF NOT EXISTS payments (
id TEXT PRIMARY KEY, -- e.g., PAY-XYZ123
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

-- Activity Log Table
-- For auditing significant user actions.
CREATE TABLE IF NOT EXISTS activity_logs (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER,
action TEXT NOT NULL,
target TEXT,
details TEXT,
metadata TEXT, -- JSON string for additional context
timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
id INTEGER PRIMARY KEY AUTOINCREMENT,
key TEXT NOT NULL UNIQUE,
value TEXT NOT NULL,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
id INTEGER PRIMARY KEY AUTOINCREMENT,
sku TEXT NOT NULL UNIQUE,
name TEXT NOT NULL,
category TEXT NOT NULL,
description TEXT,
unit TEXT NOT NULL DEFAULT 'pieces',
min_stock_level INTEGER DEFAULT 10,
current_stock INTEGER NOT NULL DEFAULT 0,
cost_per_unit REAL,
supplier_id INTEGER,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- Inventory Movements Table
CREATE TABLE IF NOT EXISTS inventory_movements (
id INTEGER PRIMARY KEY AUTOINCREMENT,
item_id INTEGER NOT NULL,
movement_type TEXT NOT NULL CHECK(movement_type IN ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER')),
quantity INTEGER NOT NULL,
unit_cost REAL,
total_cost REAL,
reference_number TEXT,
notes TEXT,
user_id INTEGER,
movement_date DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (item_id) REFERENCES inventory_items(id),
FOREIGN KEY (user_id) REFERENCES users(id)
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
debit REAL DEFAULT 0,
credit REAL DEFAULT 0,
FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE
);
