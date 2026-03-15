import { NextRequest, NextResponse } from 'next/server';
import { getChartOfAccounts, addChartOfAccount } from '@/lib/db/accounting';

export async function GET() {
  try {
    const accounts = getChartOfAccounts();
    return NextResponse.json(accounts);
  } catch (error: any) {
    console.error('Error fetching chart of accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart of accounts', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const accountData = await request.json();
    if (!accountData.code || !accountData.name || !accountData.account_type) {
      return NextResponse.json({ error: 'Code, name, and type are required' }, { status: 400 });
    }
    const newAccount = addChartOfAccount(accountData);
    return NextResponse.json(newAccount, { status: 201 });
  } catch (error: any) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { error: 'Failed to create account', message: error.message },
      { status: 500 }
    );
  }
}
