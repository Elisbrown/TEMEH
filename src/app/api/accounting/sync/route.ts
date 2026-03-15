
import { NextRequest, NextResponse } from 'next/server';
import { syncAllTransactions, getSyncStatus } from '@/lib/accounting/automation';
import { addActivityLog } from '@/lib/db/activity-logs';
import { getStaffByEmail } from '@/lib/db/staff';

async function getActorId(email?: string) {
  if (!email || email === "system") return null;
  const user = await getStaffByEmail(email);
  return user ? Number(user.id) : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate, userEmail } = body;

    const result = await syncAllTransactions(startDate, endDate);

    const actorId = await getActorId(userEmail);
    await addActivityLog(
      actorId,
      'ACCOUNTING_SYNC',
      `Synced ${result.totalSynced} transactions`,
      'ACCOUNTING',
      {
        startDate,
        endDate,
        totalSynced: result.totalSynced,
        totalAvailable: result.totalAvailable
      }
    );

    return NextResponse.json({
      success: true,
      message: `Synced ${result.totalSynced} of ${result.totalAvailable} transactions`,
      details: result,
    });
  } catch (error: any) {
    console.error('Error syncing transactions:', error);
    return NextResponse.json(
      { error: 'Failed to sync transactions', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const status = getSyncStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status', message: error.message },
      { status: 500 }
    );
  }
}
