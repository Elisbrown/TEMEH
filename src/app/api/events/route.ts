import { NextRequest } from 'next/server';
import { getAllEvents, createEvent } from '@/lib/db/events';
import { addActivityLog } from '@/lib/db/activity-logs';
import { getStaffByEmail } from '@/lib/db/staff';

async function getActorId(email?: string) {
    if (!email || email === "system") return null;
    const user = await getStaffByEmail(email);
    return user ? Number(user.id) : null;
}

export async function GET() {
  try {
    const events = getAllEvents();
    return Response.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return Response.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { title, description, start_date, end_date, location, capacity, userEmail } = data;

    if (!title || !start_date || !end_date) {
      return Response.json(
        { error: 'Title, start date, and end date are required' },
        { status: 400 }
      );
    }

    const newEvent = createEvent({
      title,
      description,
      start_date,
      end_date,
      location,
      capacity: capacity || 0
    });

    const actorId = await getActorId(userEmail);

    await addActivityLog(
        actorId,
        'EVENT_CREATE',
        `Created new event: ${title}`,
        title,
        { location, start: start_date, end: end_date }
    );

    return Response.json(newEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    return Response.json({ error: 'Failed to create event' }, { status: 500 });
  }
}