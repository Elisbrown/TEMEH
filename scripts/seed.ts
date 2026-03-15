import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

// This script should be run from the root of the project
const dbPath = path.resolve(process.cwd(), 'loungeos.db');
const db = new Database(dbPath, { verbose: console.log });

async function main() {
  console.log('Seeding database...');

  // Create users table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Super Admin', 'Manager', 'Accountant', 'Stock Manager', 'Chef', 'Waiter', 'Cashier', 'Bartender')),
      status TEXT NOT NULL DEFAULT 'Active',
      avatar TEXT,
      floor TEXT,
      force_password_change INTEGER DEFAULT 1
    );
  `);

  const users = [
    { name: 'Super Admin', email: 'superadmin@lounge.com', role: 'Super Admin', floor: null },
    { name: 'Manager User', email: 'manager@lounge.com', role: 'Manager', floor: null },
    { name: 'Accountant User', email: 'accountant@lounge.com', role: 'Accountant', floor: null },
    { name: 'Stock Manager', email: 'stock@lounge.com', role: 'Stock Manager', floor: null },
    { name: 'Chef User', email: 'chef@lounge.com', role: 'Chef', floor: null },
    { name: 'Main Waiter', email: 'waiter-main@lounge.com', role: 'Waiter', floor: 'Main Floor' },
    { name: 'VIP Waiter', email: 'waiter-vip@lounge.com', role: 'Waiter', floor: 'VIP Lounge' },
    { name: 'Cashier User', email: 'cashier@lounge.com', role: 'Cashier', floor: null },
    { name: 'Bartender User', email: 'bartender@lounge.com', role: 'Bartender', floor: null },
  ];

  const password = 'password';
  const hashedPassword = await bcrypt.hash(password, 10);

  const insert = db.prepare(
    'INSERT OR REPLACE INTO users (name, email, password, role, floor, avatar) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const insertMany = db.transaction((usersToInsert) => {
    for (const user of usersToInsert) {
        // Check if user already exists
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(user.email);
        if (!existingUser) {
            insert.run(user.name, user.email, hashedPassword, user.role, user.floor, 'https://placehold.co/100x100.png');
            console.log(`Created user: ${user.email}`);
        } else {
            console.log(`User already exists: ${user.email}`);
        }
    }
  });

  insertMany(users);

  console.log('Database seeded successfully!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(() => {
  db.close();
});
