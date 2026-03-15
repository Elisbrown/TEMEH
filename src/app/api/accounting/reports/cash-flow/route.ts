import { NextRequest, NextResponse } from 'next/server';
import { generateCashFlow } from '@/lib/accounting/reports';

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

    const report = generateCashFlow(startDate, endDate);
    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Error generating cash flow:', error);
    return NextResponse.json(
      { error: 'Failed to generate cash flow', message: error.message },
      { status: 500 }
    );
  }
}
