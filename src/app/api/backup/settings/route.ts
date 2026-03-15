
// src/app/api/backup/settings/route.ts
import { NextResponse } from 'next/server';
import { getBackupSettings, updateBackupSettings } from '@/lib/db/backup';
import { addActivityLog } from '@/lib/db/activity-logs';
import { getStaffByEmail } from '@/lib/db/staff';

async function getActorId(email?: string) {
    if (!email || email === "system") return null;
    const user = await getStaffByEmail(email);
    return user ? Number(user.id) : null;
}

// GET - Retrieve current backup settings
export async function GET() {
    try {
        const settings = getBackupSettings();
        return NextResponse.json(settings, { status: 200 });
    } catch (error: any) {
        console.error('Failed to get backup settings:', error);
        return NextResponse.json(
            { message: 'Failed to get backup settings', error: error.message },
            { status: 500 }
        );
    }
}

// PUT - Update backup settings
export async function PUT(request: Request) {
    try {
        const data = await request.json();
        const { frequency, enabled, userEmail } = data;

        if (!frequency) {
            return NextResponse.json({ message: 'Frequency is required' }, { status: 400 });
        }

        const validFrequencies = ['hourly', 'daily', 'weekly', 'monthly', 'disabled'];
        if (!validFrequencies.includes(frequency)) {
            return NextResponse.json({ message: 'Invalid frequency' }, { status: 400 });
        }

        const oldSettings = getBackupSettings();
        const settings = updateBackupSettings(frequency, enabled);
        
        const actorId = await getActorId(userEmail);
        await addActivityLog(
            actorId,
            'DB_BACKUP_SETTINGS_UPDATE',
            `Updated backup settings: ${frequency} (${enabled ? 'enabled' : 'disabled'})`,
            'DATABASE',
            { 
                frequency: { old: oldSettings?.frequency, new: frequency },
                enabled: { old: oldSettings?.enabled, new: enabled }
            }
        );

        return NextResponse.json(settings, { status: 200 });
    } catch (error: any) {
        console.error('Failed to update backup settings:', error);
        return NextResponse.json(
            { message: 'Failed to update backup settings', error: error.message },
            { status: 500 }
        );
    }
}
