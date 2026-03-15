import { NextRequest, NextResponse } from 'next/server';
import { getJournalEntryById } from '@/lib/db/accounting';
import { generateJournalEntryPDF } from '@/lib/pdf/accounting-documents';
import { getSettings } from '@/lib/db/settings';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params;
  try {
    const id = parseInt(idParam);
    const searchParams = request.nextUrl.searchParams;
    const lang = searchParams.get('lang') || 'en';

    const entry = getJournalEntryById(id);

    if (!entry) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    const appSettings = await getSettings();
    const pdf = await generateJournalEntryPDF(entry, appSettings, undefined, lang);
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="journal-entry-${id}.pdf"`,
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
