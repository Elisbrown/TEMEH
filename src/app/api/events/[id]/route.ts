
import { NextRequest } from 'next/server';
import { getEventById, updateEvent, deleteEvent } from '@/lib/db/events';
import { addActivityLog } from '@/lib/db/activity-logs';
import { getStaffByEmail } from '@/lib/db/staff';

async function getActorId(email?: string) {
    if (!email || email === "system") return null;
    const user = await getStaffByEmail(email);
    return user ? Number(user.id) : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params;
  try {
    const id = parseInt(idParam);
    const event = getEventById(id);
    
    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }
    
    return Response.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    return Response.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params;
  try {
    const id = parseInt(idParam);
    const data = await request.json();
    const { userEmail, ...eventData } = data;
    
    const oldEvent = getEventById(id);
    const updatedEvent = updateEvent(id, eventData);
    
    if (!updatedEvent) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const actorId = await getActorId(userEmail);
    await addActivityLog(
        actorId,
        'EVENT_UPDATE',
        `Updated event: ${updatedEvent.title}`,
        updatedEvent.title,
        { 
            changes: {
                title: oldEvent?.title !== updatedEvent.title ? { old: oldEvent?.title, new: updatedEvent.title } : undefined,
                location: oldEvent?.location !== updatedEvent.location ? { old: oldEvent?.location, new: updatedEvent.location } : undefined
            }
        }
    );
    
    return Response.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    return Response.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params;
  try {
    const id = parseInt(idParam);
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    
    const event = getEventById(id);
    const success = deleteEvent(id);
    
    if (!success) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const actorId = await getActorId(userEmail || undefined);
    await addActivityLog(
        actorId,
        'EVENT_DELETE',
        `Deleted event: ${event?.title || id}`,
        event?.title || String(id)
    );
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return Response.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
