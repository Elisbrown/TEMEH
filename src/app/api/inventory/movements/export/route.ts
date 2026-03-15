import { NextRequest, NextResponse } from 'next/server';
import { getInventoryMovementsByDate } from '@/lib/db/inventory';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getSettings } from '@/lib/db/settings';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const start = searchParams.get('start');
        const end = searchParams.get('end');
        const format = searchParams.get('format');

        if (!start || !end) {
            return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
        }

        const movements = await getInventoryMovementsByDate(start, end);
        const settings = await getSettings();

        if (format === 'csv') {
            const headers = ['Date', 'Item', 'SKU', 'Type', 'Quantity', 'Unit Cost', 'Total Cost', 'Reference', 'Notes', 'User'];
            const rows = movements.map(m => [
                new Date(m.movement_date).toLocaleString(),
                m.item?.name || 'N/A',
                m.item?.sku || 'N/A',
                m.movement_type,
                m.quantity,
                m.unit_cost || 0,
                m.total_cost || 0,
                `${m.reference_type || ''} ${m.reference_number || ''}`.trim(),
                m.notes || '',
                m.user?.name || 'N/A'
            ]);

            const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
            
            return new NextResponse(csvContent, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="inventory_movements_${start}_to_${end}.csv"`
                }
            });
        } else if (format === 'pdf') {
            const doc = new jsPDF();
            
            const pageWidth = doc.internal.pageSize.width;
            let currentY = 15;
            const leftMargin = 14;

            // Organization Header
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text(settings.organizationName.toUpperCase(), leftMargin, currentY);
            currentY += 7;
            
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(settings.contactAddress, leftMargin, currentY);
            currentY += 5;
            doc.text(`Tel: ${settings.contactPhone}`, leftMargin, currentY);
            currentY += 10;

            // Report Title
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text('Inventory Movements Report', leftMargin, currentY);
            currentY += 7;

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`Period: ${start} to ${end}`, leftMargin, currentY);
            currentY += 5;
            doc.text(`Generated on: ${new Date().toLocaleString()}`, leftMargin, currentY);
            currentY += 5;
            
            const tableData = movements.map(m => [
                new Date(m.movement_date).toLocaleDateString(),
                m.item?.name || 'N/A',
                m.movement_type,
                m.quantity,
                m.unit_cost ? `${m.unit_cost} ${settings.defaultCurrency.code}` : '-',
                m.total_cost ? `${m.total_cost} ${settings.defaultCurrency.code}` : '-'
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [['Date', 'Item', 'Type', 'Qty', 'Unit Cost', 'Total']],
                body: tableData,
                didDrawPage: (data) => {
                    // Footer
                    const pageSize = doc.internal.pageSize;
                    const pageHeight = pageSize.height;
                    doc.setFontSize(8);
                    doc.setFont("helvetica", "normal");
                    doc.text('Software: TEMEH', leftMargin, pageHeight - 15);
                    doc.text('Developed by SIGALIX', leftMargin, pageHeight - 10);
                    doc.text('+237 679 690 703 | sigalix.net', leftMargin, pageHeight - 5);
                }
            });

            const pdfOutput = doc.output('arraybuffer');
            
            return new NextResponse(pdfOutput, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="inventory_movements_${start}_to_${end}.pdf"`
                }
            });
        }

        return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    } catch (error) {
        console.error('Error exporting movements:', error);
        return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    }
}
