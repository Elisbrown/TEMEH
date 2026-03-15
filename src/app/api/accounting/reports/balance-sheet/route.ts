import { NextRequest, NextResponse } from 'next/server';
import { generateBalanceSheet } from '@/lib/accounting/reports';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const asOfDate = searchParams.get('asOfDate');

    if (!asOfDate) {
      return NextResponse.json(
        { error: 'asOfDate is required' },
        { status: 400 }
      );
    }

    const report = generateBalanceSheet(asOfDate);
    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Error generating balance sheet:', error);
    return NextResponse.json(
      { error: 'Failed to generate balance sheet', message: error.message },
      { status: 500 }
    );
  }
}
