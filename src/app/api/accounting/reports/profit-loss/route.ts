import { NextRequest, NextResponse } from 'next/server';
import { generateProfitAndLoss } from '@/lib/accounting/reports';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const report = generateProfitAndLoss(startDate, endDate);
    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Error generating P&L report:', error);
    return NextResponse.json(
      { error: 'Failed to generate P&L report', message: error.message },
      { status: 500 }
    );
  }
}
