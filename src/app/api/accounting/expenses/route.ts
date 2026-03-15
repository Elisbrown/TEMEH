import { NextRequest, NextResponse } from 'next/server';
import { createJournalEntry, getJournalEntries } from '@/lib/db/accounting';
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
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Fetch all journal entries that involve expense accounts
        // Since getJournalEntries doesn't filter by account type deeply, we fetch all and filter in memory or rely on 'journal' type if distinct.
        // Ideally, we'd add a db method 'getExpenses' but for now filtering works for MVP scale.

        // Better approach: Query DB directly for entries with 'expense' type lines? 
        // Re-using getJournalEntries with type filter if we used a specific entry_type for expenses, e.g. 'expense'.

        // Let's assume we use entry_type = 'expense' for manual expenses
        const entries = getJournalEntries({
            type: 'expense',
            startDate: startDate || undefined,
            endDate: endDate || undefined
        });

        return NextResponse.json(entries);
    } catch (error: any) {
        console.error('Error fetching expenses:', error);
        return NextResponse.json(
            { error: 'Failed to fetch expenses', message: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();

        if (!data.description || !data.amount || !data.accountCode || !data.date) {
            return NextResponse.json(
                { error: 'Missing required fields: description, amount, accountCode, date' },
                { status: 400 }
            );
        }

        const actorId = await getActorId(data.userEmail);

        // Create a Journal Entry wrapping this expense
        const entry = createJournalEntry({
            entry_date: data.date,
            entry_type: 'expense',
            description: data.description,
            reference: data.reference || '',
            created_by: actorId || 1,
            lines: [
                {
                    account_code: data.accountCode, // The expense account (e.g., 5100 Rent)
                    account_name: 'Expense', // Fetch name if possible, or generic
                    description: data.description,
                    debit: Number(data.amount),
                    credit: 0
                },
                {
                    account_code: '1000', // Cash 
                    account_name: 'Cash',
                    description: 'Payment for Expense',
                    debit: 0,
                    credit: Number(data.amount)
                }
            ]
        });

        await addActivityLog(
            actorId,
            'EXPENSE_CREATE',
            `Created expense: ${data.description}`,
            `ENTRY-${entry.id}`,
            { amount: data.amount, account: data.accountCode }
        );

        return NextResponse.json(entry, { status: 201 });
    } catch (error: any) {
        console.error('Error creating expense:', error);
        return NextResponse.json(
            { error: 'Failed to create expense', message: error.message },
            { status: 500 }
        );
    }
}
