// src/app/api/backup/auto/route.ts
import { NextResponse } from 'next/server';
import { createBackup, getBackupSettings, cleanupOldBackups } from '@/lib/db/backup';

// POST - Trigger automatic backup
export async function POST() {
    try {
        // Get backup settings to verify automatic backups are enabled
        const settings = getBackupSettings();
        
        if (!settings.enabled || settings.frequency === 'disabled') {
            return NextResponse.json(
                { message: 'Automatic backups are disabled' },
                { status: 400 }
            );
        }

        // Create automatic backup
        const backup = await createBackup('automatic', 'system');
        
        // Clean up old automatic backups (keep last 10)
        cleanupOldBackups(10);

        return NextResponse.json(
            {
                message: 'Automatic backup completed',
                backup: {
                    filename: backup.filename,
                    size: backup.size,
                }
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('Automatic backup failed:', error);
        return NextResponse.json(
            { message: 'Automatic backup failed', error: error.message },
            { status: 500 }
        );
    }
}
