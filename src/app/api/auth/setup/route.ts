import { NextResponse } from 'next/server';
import { isAppSetup } from '@/lib/db/staff';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'path';
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
        const schema = fs.readFileSync(path.join(process.cwd(), 'docs', 'database.md'), 'utf8');
        const sqlOnly = schema.split('```sql')[1].split('```')[0];
        db.exec(sqlOnly);
    }
    dbInstance = db;
    return db;
}

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const isSetup = await isAppSetup();
        if (isSetup) {
            return NextResponse.json({ message: 'Application is already setup' }, { status: 400 });
        }

        const { name, email, password } = await request.json();

        if (!name || !email || !password) {
            return NextResponse.json({ message: 'Name, email and password are required' }, { status: 400 });
        }

        const db = getDb();
        const hashedPassword = await bcrypt.hash(password, 10);

        const stmt = db.prepare(`
            INSERT INTO users (name, email, password, role, status, avatar, force_password_change)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(name, email, hashedPassword, 'Super Admin', 'Active', 'https://placehold.co/100x100.png', 0);

        return NextResponse.json({ message: 'Super Admin created successfully. Setup complete.' });
    } catch (error: any) {
        console.error('[Setup] Error:', error);
        return NextResponse.json({ message: 'Failed to complete setup', error: error.message }, { status: 500 });
    }
}
