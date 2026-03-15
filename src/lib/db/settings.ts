// src/lib/db/settings.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import type { Settings, Theme, ReceiptField } from '@/context/settings-context';

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

        // Create settings table if it doesn't exist
        db.exec(`
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT NOT NULL UNIQUE,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("Database schema initialized.");
    }

    dbInstance = db;
    return db;
}

const getInitialSettings = (): Settings => ({
    platformName: 'TEMEH',
    platformLogo: '',
    organizationName: 'TEMEH Inc.',
    contactAddress: '123 Tech Street, Silicon Valley',
    contactPhone: '+1 234 567 890',
    activeTheme: 'Default',
    themes: [
        {
            name: "Default",
            colors: {
                primary: "#E11D48",
                background: "#09090B",
                accent: "#27272A",
            }
        }
    ],
    receiptHeader: "Welcome to our establishment!",
    receiptFooter: "Thank you for your visit! Come again!",
    receiptShowWaiter: true,
    receiptCustomFields: [
        { label: 'NIU', value: 'P123456789012' },
    ],
    receiptLineSpacing: 1.5,
    receiptFont: 'mono',
    loginCarouselImages: [
        'https://placehold.co/1920x1080.png'
    ],
    // Currency & Financial Settings
    defaultCurrency: { code: 'XAF', name: 'Central African Franc', symbol: 'FCFA', position: 'before' },
    availableCurrencies: [
        { code: 'XAF', name: 'Central African Franc', symbol: 'FCFA', position: 'before' },
        { code: 'USD', name: 'United States Dollar', symbol: '$', position: 'before' },
        { code: 'EUR', name: 'Euro', symbol: '€', position: 'before' },
        { code: 'GBP', name: 'British Pound', symbol: '£', position: 'before' },
        { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', position: 'before' },
        { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', position: 'before' },
    ],
    // Tax Management
    taxEnabled: true,
    taxRates: [
        { id: 'VAT', name: 'Value Added Tax (VAT)', rate: 19, isDefault: true },
        { id: 'GST', name: 'Goods and Services Tax (GST)', rate: 10, isDefault: false },
        { id: 'PST', name: 'Property Tax (PST)', rate: 5, isDefault: false },
    ],
    // Discount Management
    discountEnabled: true,
    discountRules: [
        { id: '1', name: 'No Discount', type: 'percentage', value: 0, isActive: true },
        { id: '2', name: '10% Discount', type: 'percentage', value: 10, isActive: true },
        { id: '3', name: '20% Discount', type: 'percentage', value: 20, isActive: true },
        { id: '4', name: 'Fixed 1000 FCFA', type: 'fixed', value: 1000, isActive: true },
    ],
});

export async function getSettings(): Promise<Settings> {
    const db = getDb();
    try {
        const stmt = db.prepare('SELECT key, value FROM settings');
        const rows = stmt.all() as { key: string; value: string }[];

        if (rows.length === 0) {
            // No settings found, initialize with defaults
            const initialSettings = getInitialSettings();
            await setSettings(initialSettings);
            return initialSettings;
        }

        // Convert rows to settings object
        const settings: any = {};
        rows.forEach(row => {
            try {
                settings[row.key] = JSON.parse(row.value);
            } catch (e) {
                console.error(`Error parsing setting ${row.key}:`, e);
            }
        });

        // Merge with defaults to ensure all required fields exist
        const defaultSettings = getInitialSettings();
        const mergedSettings = { ...defaultSettings, ...settings };

        return mergedSettings;
    } finally {
        // No close
    }
}

export async function setSettings(settings: Settings): Promise<void> {
    const db = getDb();
    try {
        const transaction = db.transaction((settingsObj: Settings) => {
            // Clear existing settings
            db.prepare('DELETE FROM settings').run();

            // Insert new settings
            const insertStmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');

            Object.entries(settingsObj).forEach(([key, value]) => {
                insertStmt.run(key, JSON.stringify(value));
            });
        });

        transaction(settings);
    } finally {
        // No close
    }
}

export async function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
    const db = getDb();
    try {
        const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)');
        stmt.run(key, JSON.stringify(value), new Date().toISOString());
    } finally {
        // No close
    }
}

// Helper function to save uploaded images
export async function saveImage(file: Buffer, filename: string): Promise<string> {
    // In production (Electron), we must use the userData path defined in main.js via process.env.UPLOAD_DIR
    // In dev, we fallback to local uploads folder
    const uploadsDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const imagesDir = path.join(uploadsDir, 'images');

    // Create directories if they don't exist
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }

    const filePath = path.join(imagesDir, filename);
    fs.writeFileSync(filePath, file);

    const returnPath = `/api/files/images/${filename}`;
    console.log(`[saveImage] Saved image to ${filePath}, returning path: ${returnPath}`);

    // Return the API path (served via /api/files)
    return returnPath;
}

// Helper function to delete uploaded images
export async function deleteImage(imagePath: string): Promise<void> {
    // Handle both /api/files/images/ and legacy /uploads/images/ formats
    let relativePath = '';
    if (imagePath.startsWith('/api/files/')) {
        relativePath = imagePath.replace('/api/files/', '');
    } else if (imagePath.startsWith('/uploads/')) {
        // Legacy support for public/uploads
        const legacyPath = path.join(process.cwd(), 'public', imagePath);
        if (fs.existsSync(legacyPath)) {
            fs.unlinkSync(legacyPath);
        }
        return;
    }

    if (relativePath) {
        const fullPath = path.join(process.cwd(), 'uploads', relativePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
    }
}