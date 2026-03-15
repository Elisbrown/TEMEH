// src/app/api/activity-logs/route.ts
import { NextResponse } from 'next/server';
import { getActivityLogs, addActivityLog, clearActivityLogs } from '@/lib/db/activity-logs';
import { getStaffByEmail } from '@/lib/db/staff';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const logs = await getActivityLogs();
        return NextResponse.json(logs);
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to fetch activity logs', error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId, action, details, target, metadata, userEmail } = await request.json();
        
        if (!action) {
            return NextResponse.json({ message: 'Action is required' }, { status: 400 });
        }

        let finalUserId = userId;
        
        // Resolve user ID from email if not provided
        if (!finalUserId && userEmail && userEmail !== 'system') {
            const user = await getStaffByEmail(userEmail);
            finalUserId = user ? parseInt(user.id) : null;
        }

        const newLog = await addActivityLog(
            finalUserId, 
            action, 
            details || '', 
            target || null, 
            metadata || null
        );
        return NextResponse.json(newLog, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to add activity log', error: error.message }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        await clearActivityLogs();
        return NextResponse.json({ message: 'Activity logs cleared successfully' });
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to clear activity logs', error: error.message }, { status: 500 });
    }
} 