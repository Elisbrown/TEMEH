
// src/app/api/tickets/route.ts
import { NextResponse } from 'next/server';
import { getTickets, createTicket } from '@/lib/db/tickets';
import { addActivityLog } from '@/lib/db/activity-logs';
import { getStaffByEmail } from '@/lib/db/staff';

export const runtime = 'nodejs';

async function getActorId(email?: string) {
    if (!email || email === "system") return null;
    const user = await getStaffByEmail(email);
    return user ? Number(user.id) : null;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        
        const filters = {
            status: searchParams.get('status') || undefined,
            priority: searchParams.get('priority') || undefined,
            category: searchParams.get('category') || undefined,
            assigned_to: searchParams.get('assigned_to') ? Number(searchParams.get('assigned_to')) : undefined,
            created_by: searchParams.get('created_by') ? Number(searchParams.get('created_by')) : undefined,
        };
        
        const tickets = getTickets(filters);
        return NextResponse.json(tickets);
    } catch (error: any) {
        console.error('Failed to fetch tickets:', error);
        return NextResponse.json({ message: 'Failed to fetch tickets', error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const ticketData = await request.json();
        const { userEmail, ...data } = ticketData;
        
        const newTicket = createTicket({
            title: data.title,
            description: data.description,
            priority: data.priority || 'Medium',
            category: data.category,
            created_by: data.created_by
        });
        
        const actorId = await getActorId(userEmail);

        // Log activity
        await addActivityLog(
            actorId || data.created_by,
            'TICKET_CREATE',
            `Created ticket: ${newTicket.title}`,
            `TICKET-${newTicket.id}`,
            { priority: newTicket.priority, category: newTicket.category }
        );
        
        return NextResponse.json(newTicket, { status: 201 });
    } catch (error: any) {
        console.error('Failed to create ticket:', error);
        return NextResponse.json({ message: 'Failed to create ticket', error: error.message }, { status: 500 });
    }
}
