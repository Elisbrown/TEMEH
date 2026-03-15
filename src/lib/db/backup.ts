// src/lib/db/backup.ts
import path from 'path';
import Database from 'better-sqlite3';
import fs from 'fs';

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db');
const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

export interface BackupRecord {
    id: number;
    filename: string;
    size: number;
    created_at: string;
    type: 'manual' | 'automatic';
    status: 'completed' | 'failed';
    created_by?: string;
}

export interface BackupSettings {
    id: number;
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'disabled';
    last_backup?: string;
    next_backup?: string;
    enabled: boolean;
}

// Initialize backup tables
export function initializeBackupTables() {
    const db = new Database(dbPath);
    
    // Create backups table
    db.exec(`
        CREATE TABLE IF NOT EXISTS backups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            size INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'manual',
            status TEXT DEFAULT 'completed',
            created_by TEXT
        )
    `);
    
    // Create backup_settings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS backup_settings (
            id INTEGER PRIMARY KEY DEFAULT 1,
            frequency TEXT DEFAULT 'daily',
            last_backup TEXT,
            next_backup TEXT,
            enabled INTEGER DEFAULT 0
        )
    `);
    
    // Insert default settings if not exists
    const settingsExists = db.prepare('SELECT id FROM backup_settings WHERE id = 1').get();
    if (!settingsExists) {
        db.prepare(`
            INSERT INTO backup_settings (id, frequency, enabled) 
            VALUES (1, 'daily', 0)
        `).run();
    }
    
    db.close();
}

// Get backup history
export function getBackupHistory(limit = 10): BackupRecord[] {
    const db = new Database(dbPath, { readonly: true });
    const backups = db.prepare(`
        SELECT * FROM backups 
        ORDER BY created_at DESC 
        LIMIT ?
    `).all(limit) as BackupRecord[];
    db.close();
    return backups;
}

// Get single backup by ID
export function getBackupById(id: number): BackupRecord | undefined {
    const db = new Database(dbPath, { readonly: true });
    const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get(id) as BackupRecord | undefined;
    db.close();
    return backup;
}

// Record a backup
export function recordBackup(
    filename: string,
    size: number,
    type: 'manual' | 'automatic',
    createdBy?: string
): BackupRecord {
    const db = new Database(dbPath);
    const createdAt = new Date().toISOString();
    
    const result = db.prepare(`
        INSERT INTO backups (filename, size, created_at, type, status, created_by)
        VALUES (?, ?, ?, ?, 'completed', ?)
    `).run(filename, size, createdAt, type, createdBy || null);
    
    const backup = db.prepare('SELECT * FROM backups WHERE id = ?').get(result.lastInsertRowid) as BackupRecord;
    db.close();
    
    return backup;
}

// Delete a backup record
export function deleteBackupRecord(id: number): boolean {
    const db = new Database(dbPath);
    
    // Get backup filename before deleting
    const backup = db.prepare('SELECT filename FROM backups WHERE id = ?').get(id) as { filename: string } | undefined;
    
    if (!backup) {
        db.close();
        return false;
    }
    
    // Delete from database
    db.prepare('DELETE FROM backups WHERE id = ?').run(id);
    
    // Delete physical file
    const backupFilePath = path.join(backupDir, backup.filename);
    if (fs.existsSync(backupFilePath)) {
        try {
            fs.unlinkSync(backupFilePath);
        } catch (error) {
            console.error('Failed to delete backup file:', error);
        }
    }
    
    db.close();
    return true;
}

// Get backup settings
export function getBackupSettings(): BackupSettings {
    const db = new Database(dbPath, { readonly: true });
    const settings = db.prepare('SELECT * FROM backup_settings WHERE id = 1').get() as any;
    db.close();
    
    if (!settings) {
        return {
            id: 1,
            frequency: 'daily',
            enabled: false
        };
    }

    // Convert SQLite integer to boolean
    return {
        ...settings,
        enabled: settings.enabled === 1
    };
}

// Update backup settings
export function updateBackupSettings(
    frequency: string,
    enabled: boolean
): BackupSettings {
    const db = new Database(dbPath);
    
    // Calculate next backup time
    const nextBackup = calculateNextBackup(frequency, new Date().toISOString());
    
    db.prepare(`
        UPDATE backup_settings 
        SET frequency = ?, enabled = ?, next_backup = ?
        WHERE id = 1
    `).run(frequency, enabled ? 1 : 0, nextBackup);
    
    const settings = db.prepare('SELECT * FROM backup_settings WHERE id = 1').get() as any;
    db.close();
    
    return {
        ...settings,
        enabled: settings.enabled === 1
    };
}

// Update last backup time
export function updateLastBackup(): void {
    const db = new Database(dbPath);
    const now = new Date().toISOString();
    const settings = getBackupSettings();
    const nextBackup = calculateNextBackup(settings.frequency, now);
    
    db.prepare(`
        UPDATE backup_settings 
        SET last_backup = ?, next_backup = ?
        WHERE id = 1
    `).run(now, nextBackup);
    
    db.close();
}

// Calculate next backup time based on frequency
export function calculateNextBackup(frequency: string, lastBackup: string): string {
    const last = new Date(lastBackup);
    let next = new Date(last);
    
    switch (frequency) {
        case 'hourly':
            next.setHours(next.getHours() + 1);
            break;
        case 'daily':
            next.setDate(next.getDate() + 1);
            break;
        case 'weekly':
            next.setDate(next.getDate() + 7);
            break;
        case 'monthly':
            next.setMonth(next.getMonth() + 1);
            break;
        case 'disabled':
        default:
            return '';
    }
    
    return next.toISOString();
}

// Create a backup file and record it
export async function createBackup(
    type: 'manual' | 'automatic',
    createdBy?: string
): Promise<{ filename: string; size: number; path: string }> {
    const db = new Database(dbPath, { readonly: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `temeh_backup_${timestamp}.db`;
    const backupFilePath = path.join(backupDir, filename);
    
    // Create backup using better-sqlite3's backup method
    await db.backup(backupFilePath);
    db.close();
    
    // Get file size
    const stats = fs.statSync(backupFilePath);
    const size = stats.size;
    
    // Record in database
    recordBackup(filename, size, type, createdBy);
    
    // Update last backup time if automatic
    if (type === 'automatic') {
        updateLastBackup();
    }
    
    return { filename, size, path: backupFilePath };
}

// Clean up old backups (keep only N most recent)
export function cleanupOldBackups(keepCount = 10): number {
    const db = new Database(dbPath);
    
    // Get all backups ordered by date
    const allBackups = db.prepare(`
        SELECT * FROM backups 
        ORDER BY created_at DESC
    `).all() as BackupRecord[];
    
    // Keep only manual backups or the most recent N
    const toDelete = allBackups.slice(keepCount).filter(b => b.type === 'automatic');
    
    let deletedCount = 0;
    for (const backup of toDelete) {
        if (deleteBackupRecord(backup.id)) {
            deletedCount++;
        }
    }
    
    db.close();
    return deletedCount;
}

// Initialize tables on import
initializeBackupTables();
