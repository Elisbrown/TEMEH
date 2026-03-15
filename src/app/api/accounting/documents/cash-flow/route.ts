import { NextRequest, NextResponse } from 'next/server';
import { generateCashFlow } from '@/lib/accounting/reports';
import { generateCashFlowPDF } from '@/lib/pdf/accounting-documents';
import { getSettings } from '@/lib/db/settings';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const lang = searchParams.get('lang') || 'en';

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const report = generateCashFlow(startDate, endDate);
    const appSettings = await getSettings();
    const pdf = await generateCashFlowPDF(report, appSettings, undefined, lang);
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="cash-flow-${startDate}-to-${endDate}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', message: error.message },
      { status: 500 }
    );
  }
}
