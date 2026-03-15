import { NextRequest, NextResponse } from 'next/server';
import { generateBalanceSheet } from '@/lib/accounting/reports';
import { generateBalanceSheetPDF } from '@/lib/pdf/accounting-documents';
import { getSettings } from '@/lib/db/settings';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const asOfDate = searchParams.get('asOfDate');
    const lang = searchParams.get('lang') || 'en';

    if (!asOfDate) {
      return NextResponse.json(
        { error: 'asOfDate is required' },
        { status: 400 }
      );
    }

    const report = generateBalanceSheet(asOfDate);
    const appSettings = await getSettings();
    const pdf = await generateBalanceSheetPDF(report, appSettings, undefined, lang);
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="balance-sheet-${asOfDate}.pdf"`,
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
