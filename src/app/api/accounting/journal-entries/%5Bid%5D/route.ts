
import { NextRequest, NextResponse } from 'next/server';
import { getJournalEntryById, updateJournalEntry, deleteJournalEntry } from '@/lib/db/accounting';
import { addActivityLog } from '@/lib/db/activity-logs';
import { getStaffByEmail } from '@/lib/db/staff';

async function getActorId(email?: string) {
    if (!email || email === "system") return null;
    const user = await getStaffByEmail(email);
    return user ? Number(user.id) : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const entry = getJournalEntryById(id);

    if (!entry) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    return NextResponse.json(entry);
  } catch (error: any) {
    console.error('Error fetching journal entry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch journal entry', message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const { userEmail, ...data } = body;

    const oldEntry = getJournalEntryById(id);
    const updatedEntry = updateJournalEntry(id, data);

    if (!updatedEntry) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    const actorId = await getActorId(userEmail);
    await addActivityLog(
        actorId,
        'JOURNAL_ENTRY_UPDATE',
        `Updated journal entry: ${updatedEntry.reference || id}`,
        updatedEntry.reference || String(id),
        {
            description: updatedEntry.description,
            amount: updatedEntry.total_amount
        }
    );

    return NextResponse.json(updatedEntry);
  } catch (error: any) {
    console.error('Error updating journal entry:', error);
    return NextResponse.json(
      { error: 'Failed to update journal entry', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');
    
    const entry = getJournalEntryById(id);
    const success = deleteJournalEntry(id);

    if (!success) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    const actorId = await getActorId(userEmail || undefined);
    await addActivityLog(
        actorId,
        'JOURNAL_ENTRY_DELETE',
        `Deleted journal entry: ${entry?.reference || id}`,
        entry?.reference || String(id)
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting journal entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete journal entry', message: error.message },
      { status: 500 }
    );
  }
}
