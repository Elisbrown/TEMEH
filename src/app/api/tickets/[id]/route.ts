
// src/app/api/tickets/[id]/route.ts
import { NextResponse } from 'next/server';
import { getTicketById, updateTicket, deleteTicket } from '@/lib/db/tickets';
import { addActivityLog } from '@/lib/db/activity-logs';
import { getStaffByEmail } from '@/lib/db/staff';

export const runtime = 'nodejs';

async function getActorId(email?: string) {
    if (!email || email === "system") return null;
    const user = await getStaffByEmail(email);
    return user ? Number(user.id) : null;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const ticket = getTicketById(Number(id));
        
        if (!ticket) {
            return NextResponse.json({ message: 'Ticket not found' }, { status: 404 });
        }
        
        return NextResponse.json(ticket);
    } catch (error: any) {
        console.error('Failed to fetch ticket:', error);
        return NextResponse.json({ message: 'Failed to fetch ticket', error: error.message }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const body = await request.json();
        const { userEmail, ...ticketData } = body;
        const ticketId = Number(id);
        
        const oldTicket = getTicketById(ticketId);
        const updatedTicket = updateTicket(ticketId, ticketData);
        
        if (!updatedTicket) {
            return NextResponse.json({ message: 'Ticket not found' }, { status: 404 });
        }

        const actorId = await getActorId(userEmail);

        await addActivityLog(
            actorId || updatedTicket.created_by,
            'TICKET_UPDATE',
            `Updated ticket: ${updatedTicket.title}`,
            `TICKET-${updatedTicket.id}`,
            {
                status: oldTicket?.status !== updatedTicket.status ? { old: oldTicket?.status, new: updatedTicket.status } : undefined,
                priority: oldTicket?.priority !== updatedTicket.priority ? { old: oldTicket?.priority, new: updatedTicket.priority } : undefined
            }
        );
        
        return NextResponse.json(updatedTicket);
    } catch (error: any) {
        console.error('Failed to update ticket:', error);
        return NextResponse.json({ message: 'Failed to update ticket', error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const ticketId = Number(id);
        const { searchParams } = new URL(request.url);
        const userEmail = searchParams.get('userEmail');
        
        // Get ticket before deletion for logging
        const ticket = getTicketById(ticketId);
        if (!ticket) {
            return NextResponse.json({ message: 'Ticket not found' }, { status: 404 });
        }
        
        const deleted = deleteTicket(ticketId);
        
        if (deleted) {
            const actorId = await getActorId(userEmail || undefined);
            await addActivityLog(
                actorId || ticket.created_by,
                'TICKET_DELETE',
                `Deleted ticket: ${ticket.title}`,
                `TICKET-${ticketId}`
            );
            
            return NextResponse.json({ message: 'Ticket deleted successfully' });
        } else {
            return NextResponse.json({ message: 'Failed to delete ticket' }, { status: 500 });
        }
    } catch (error: any) {
        console.error('Failed to delete ticket:', error);
        return NextResponse.json({ message: 'Failed to delete ticket', error: error.message }, { status: 500 });
    }
}
