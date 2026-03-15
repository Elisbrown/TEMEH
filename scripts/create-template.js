const Database = require('better-sqlite3');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const sourceDb = 'loungeos.db';
const templateDb = 'template.db';

if (fs.existsSync(templateDb)) {
    fs.unlinkSync(templateDb);
}

fs.copyFileSync(sourceDb, templateDb);

const db = new Database(templateDb);

try {
    db.prepare('PRAGMA foreign_keys = OFF').run();

    // Get all tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();

    console.log(`Clearing ${tables.length} tables...`);

    // Clear all tables except users
    for (const table of tables) {
        if (table.name === 'users' || table.name === 'sqlite_sequence') continue;
        console.log(`  Clearing table: ${table.name}`);
        try {
            db.prepare(`DELETE FROM ${table.name}`).run();
        } catch (err) {
            console.warn(`  ! Could not clear table ${table.name}: ${err.message}`);
        }
    }

    // Handle users table
    console.log('Cleaning users table...');
    db.prepare("DELETE FROM users WHERE email != 'sunyinelisbrown@gmail.com'").run();

    // Ensure the admin user has the correct password and settings
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('12345678', salt);

    const updateAdmin = db.prepare(`
        UPDATE users 
        SET password = ?, 
            force_password_change = 1,
            name = 'Sunyin Elisbrown Sigala',
            phone = '+237679690703',
            role = 'Super Admin',
            status = 'Active'
        WHERE email = 'sunyinelisbrown@gmail.com'
    `);

    const result = updateAdmin.run(hashedPassword);

    if (result.changes === 0) {
        console.log('Admin user not found, inserting...');
        const insertAdmin = db.prepare(`
            INSERT INTO users (name, email, password, role, status, force_password_change, phone)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        insertAdmin.run('Sunyin Elisbrown Sigala', 'sunyinelisbrown@gmail.com', hashedPassword, 'Super Admin', 'Active', 1, '+237679690703');
    }

    console.log('✓ template.db prepared successfully');

} catch (e) {
    console.error('Error preparing template:', e.message);
    process.exit(1);
} finally {
    db.close();
}
