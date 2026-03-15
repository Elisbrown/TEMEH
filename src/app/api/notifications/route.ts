
import { NextRequest, NextResponse } from 'next/server';
import { getNotifications, createNotification, markNotificationAsRead, markAllNotificationsAsRead, clearAllNotifications } from '@/lib/db/notifications';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        const notifications = await getNotifications();
        return NextResponse.json(notifications);
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to fetch notifications' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (body.action === 'mark_read') {
            await markNotificationAsRead(body.id);
            return NextResponse.json({ success: true });
        }

        if (body.action === 'mark_all_read') {
            await markAllNotificationsAsRead();
            return NextResponse.json({ success: true });
        }

        // Create new notification
        const notif = await createNotification({
            title: body.title,
            description: body.description,
            type: body.type,
            user_id: body.user_id
        });

        return NextResponse.json(notif);
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to process notification request' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        await clearAllNotifications();
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to clear notifications' }, { status: 500 });
    }
}
