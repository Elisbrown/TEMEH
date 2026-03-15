import { NextRequest, NextResponse } from 'next/server';
import { getJournalEntries, createJournalEntry } from '@/lib/db/accounting';
import { addActivityLog } from '@/lib/db/activity-logs';
import { getStaffByEmail } from '@/lib/db/staff';

async function getActorId(email?: string) {
  if (!email || email === "system") return null;
  const user = await getStaffByEmail(email);
  return user ? Number(user.id) : null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = {
      type: (searchParams.get('type') === 'general' ? undefined : searchParams.get('type')) || undefined,
      status: searchParams.get('status') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    };

    const entries = getJournalEntries(filters);
    return NextResponse.json(entries);
  } catch (error: any) {
    console.error('Error fetching journal entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch journal entries', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.entry_date || !data.entry_type || !data.lines || data.lines.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: entry_date, entry_type, and lines are required' },
        { status: 400 }
      );
    }

    // Validate debits = credits
    const totalDebits = data.lines.reduce((sum: number, line: any) => sum + (line.debit || 0), 0);
    const totalCredits = data.lines.reduce((sum: number, line: any) => sum + (line.credit || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return NextResponse.json(
        { error: 'Debits must equal credits', totalDebits, totalCredits },
        { status: 400 }
      );
    }

    const entry = createJournalEntry(data);
    const actorId = await getActorId(data.userEmail);

    await addActivityLog(
      actorId,
      'FIN_JOURNAL_CREATE',
      `Created journal entry: ${data.description}`,
      `ENTRY-${entry.id}`,
      { type: data.entry_type, amount: entry.total_amount, linesCount: data.lines.length }
    );

    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    console.error('Error creating journal entry:', error);
    return NextResponse.json(
      { error: 'Failed to create journal entry', message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
    }

    const { updateJournalEntry } = await import('@/lib/db/accounting');
    const updated = updateJournalEntry(id, updateData);

    if (!updated) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    // Log activity
    const actorId = await getActorId(body.userEmail);
    await addActivityLog(
      actorId,
      'FIN_JOURNAL_UPDATE',
      `Updated journal entry ${id}`,
      `ENTRY-${id}`,
      { ...updateData }
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userEmail = searchParams.get('userEmail');

    if (!id) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
    }

    const { deleteJournalEntry } = await import('@/lib/db/accounting');
    const success = deleteJournalEntry(Number(id));

    if (!success) {
      return NextResponse.json({ error: 'Journal entry not found or could not be deleted' }, { status: 404 });
    }

    // Log activity
    const actorId = await getActorId(userEmail || undefined);
    await addActivityLog(
      actorId,
      'FIN_JOURNAL_DELETE',
      `Deleted journal entry ${id}`,
      `ENTRY-${id}`,
      {}
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
