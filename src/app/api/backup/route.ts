
// src/app/api/backup/route.ts
import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { recordBackup } from '@/lib/db/backup';
import { addActivityLog } from '@/lib/db/activity-logs';
import { getStaffByEmail } from '@/lib/db/staff';

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db');
const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');

if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

async function getActorId(email?: string) {
    if (!email || email === "system") return null;
    const user = await getStaffByEmail(email);
    return user ? Number(user.id) : null;
}

function getFormattedTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userEmail = searchParams.get('userEmail');
        const db = new Database(dbPath, { readonly: true });
        
        const backupFilename = `temeh_backup_${getFormattedTimestamp()}.db`;
        const backupFilePath = path.join(backupDir, backupFilename);
        
        await db.backup(backupFilePath);
        db.close();

        const fileBuffer = fs.readFileSync(backupFilePath);
        const fileSize = fileBuffer.length;
        
        try {
            recordBackup(backupFilename, fileSize, 'manual');
            const actorId = await getActorId(userEmail || undefined);
            await addActivityLog(
                actorId, 
                'DB_BACKUP_MANUAL', 
                `Manual database backup created: ${backupFilename}`, 
                'DATABASE',
                { filename: backupFilename, size: fileSize }
            );
        } catch (error) {
            console.error('Failed to record backup:', error);
        }

        return new NextResponse(new Uint8Array(fileBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/x-sqlite3',
                'Content-Disposition': `attachment; filename="${backupFilename}"`,
            },
        });

    } catch (error: any) {
        console.error('Backup failed:', error);
        return NextResponse.json({ message: 'Backup failed', error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('backupFile') as File | null;
        const userEmail = formData.get('userEmail') as string | null;

        if (!file) {
            return NextResponse.json({ message: 'No backup file provided' }, { status: 400 });
        }
        
        const tempPath = path.join(os.tmpdir(), file.name);
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(tempPath, fileBuffer);



        // Close any existing connections if possible (not easy with global pool, but removing WAL helps)
        
        // Remove existing WAL/SHM files to prevent corruption/stale data
        const walPath = `${dbPath}-wal`;
        const shmPath = `${dbPath}-shm`;
        
        try {
            if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
            if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
        } catch (e) {
            console.warn('Failed to clean up WAL/SHM files:', e);
        }

        // Replace the current database with the backup
        fs.renameSync(tempPath, dbPath);
        
        // Ensure WAL/SHM are gone again after replacement (just in case)
        try {
            if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
            if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
        } catch (e) {
            // Ignore
        }

        const actorId = await getActorId(userEmail || undefined);
        await addActivityLog(
            actorId, 
            'DB_RESTORE', 
            `Database restored from file: ${file.name}`, 
            'DATABASE', 
            { filename: file.name, size: file.size }
        );

        return NextResponse.json({ message: 'Restore successful. Please restart the application.' }, { status: 200 });

    } catch (error: any) {
        console.error('Restore failed:', error);
        return NextResponse.json({ message: 'Restore failed', error: error.message }, { status: 500 });
    }
}
