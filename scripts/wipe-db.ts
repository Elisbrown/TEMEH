import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'loungeos.db');

console.log(`Starting database wipe for: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
    console.error('Database file not found at:', dbPath);
    process.exit(1);
}

const db = new Database(dbPath);

try {
    // List all tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];
    
    // Disable foreign keys to allow deleting in any order
    db.pragma('foreign_keys = OFF');

    db.transaction(() => {
        for (const table of tables) {
            console.log(`Wiping table: ${table.name}`);
            try {
                // Delete all rows but keep structure
                db.prepare(`DELETE FROM ${table.name}`).run();
                // Reset auto-increment
                db.prepare("DELETE FROM sqlite_sequence WHERE name = ?").run(table.name);
            } catch (e: any) {
                console.warn(`Could not wipe table ${table.name}: ${e.message}`);
            }
        }
    })();
    
    // Re-enable foreign keys
    db.pragma('foreign_keys = ON');

    console.log('Database wipe successful. Structure preserved, data cleared.');
} catch (error: any) {
    console.error('Failed to wipe database:', error.message);
    process.exit(1);
} finally {
    db.close();
}
