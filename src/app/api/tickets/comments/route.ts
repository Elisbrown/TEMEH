
// src/app/api/tickets/comments/route.ts
import { NextResponse } from 'next/server';
import { addComment, getTicketById } from '@/lib/db/tickets';
import { addActivityLog } from '@/lib/db/activity-logs';
import { getStaffByEmail } from '@/lib/db/staff';

import { createNotification } from '@/lib/db/notifications';

async function getActorId(email?: string) {
    if (!email || email === "system") return null;
    const user = await getStaffByEmail(email);
    return user ? Number(user.id) : null;
}

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const userEmail = searchParams.get('userEmail');

        if (!id) {
            return NextResponse.json({ message: 'Ticket ID query parameter is required' }, { status: 400 });
        }
        
        const commentData = await request.json();
        const updatedTicket = await addComment(id, commentData);
        
        const actorId = await getActorId(userEmail || undefined);
        const ticket = getTicketById(Number(id));

        await addActivityLog(
            actorId || commentData.author_id,
            'TICKET_COMMENT_ADD',
            `Added comment to ticket: ${ticket?.title || id}`,
            `TICKET-${id}`,
            { comment: commentData.content?.substring(0, 100) + (commentData.content?.length > 100 ? '...' : '') }
        );

        // Create notification
        await createNotification({
            title: `New Comment on Ticket #${id}`,
            description: `A new comment was added to "${ticket?.title || 'Unknown Ticket'}"`,
            type: 'info'
        });

        return NextResponse.json(updatedTicket, { status: 201 });
    } catch (error: any) {
        console.error('Failed to add comment:', error);
        return NextResponse.json({ message: 'Failed to add comment', error: error.message }, { status: 500 });
    }
}
