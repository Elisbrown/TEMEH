import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import enTranslations from '@/locales/en.json';
import frTranslations from '@/locales/fr.json';

const translations: any = {
  en: enTranslations,
  fr: frTranslations
};

const getTranslation = (key: string, lang: string = 'en') => {
  const keys = key.split('.');
  let result = translations[lang] || translations['en'];

  for (const k of keys) {
    result = result?.[k];
    if (result === undefined) {
      // Fallback to English
      let fallback = translations['en'];
      for (const fk of keys) {
        fallback = fallback?.[fk];
      }
      return fallback || key;
    }
  }

  return result;
};

interface Currency {
  code: string;
  symbol: string;
  position: 'before' | 'after';
}

interface Settings {
  platformName: string;
  platformLogo: string;
  organizationName: string;
  contactAddress: string;
  contactPhone: string;
  defaultCurrency: Currency;
}

const getBase64Image = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return '';

    if (typeof window !== 'undefined' && typeof FileReader !== 'undefined') {
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      // Server side (Node.js)
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/png';
      return `data:${contentType};base64,${buffer.toString('base64')}`;
    }
  } catch (e) {
    console.error('Failed to get base64 image:', e);
    return '';
  }
};

// Format currency for display
function formatAmount(amount: number, currency: any): string {
  const code = typeof currency === 'string' ? currency : (currency?.code || 'XAF');
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
  }).format(amount);
}

async function addUniversalHeaderAndFooter(doc: jsPDF, title: string, userInfo?: { name: string }, settings?: Settings, lang: string = 'en') {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const t = (key: string) => getTranslation(key, lang);

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // --- HEADER ---
    // Right side: Info about who generated it
    doc.setFontSize(9);
    doc.setTextColor(100);
    const rightX = pageWidth - 14;
    if (userInfo) {
      doc.text(`${t('accounting.reports.generatedBy')}: ${userInfo.name}`, rightX, 12, { align: 'right' });
    }
    doc.text(`${t('date') || 'Date'}: ${new Date().toLocaleString()}`, rightX, 17, { align: 'right' });

    // Left side: Logo and Organization Info
    let leftContentY = 12;
    if (settings) {
      if (settings.platformLogo) {
        try {
          const base64Logo = await getBase64Image(settings.platformLogo);
          if (base64Logo) {
            doc.addImage(base64Logo, 'PNG', 14, 8, 10, 10);
            leftContentY = 22; // Push text down if logo is present
          }
        } catch (e) { }
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text(settings.organizationName, 14, leftContentY);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`${settings.contactAddress} | Tel: ${settings.contactPhone}`, 14, leftContentY + 4);

      leftContentY += 10;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(title.toUpperCase(), 14, leftContentY);
    doc.line(14, leftContentY + 2, pageWidth - 14, leftContentY + 2);

    // --- FOOTER ---
    doc.setFontSize(8);
    doc.setTextColor(150);

    const footerText1 = "Software: TEMEH | Developed by Sunyin Elisbrown (SIGALIX)";
    const footerText2 = "Contact: elisbrown@sigalix.net | +237 679 690 703 | sigalix.net";

    doc.text(footerText1, 14, pageHeight - 12);
    doc.text(footerText2, 14, pageHeight - 8);

    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
  }
}

// Generate Journal Entry PDF
export async function generateJournalEntryPDF(entry: any, settings: Settings, userInfo?: { name: string }, lang: string = 'en') {
  const doc = new jsPDF();
  const t = (key: string) => getTranslation(key, lang);

  // Entry Details
  doc.setFontSize(10);
  doc.text(`Entry #: ${entry.id}`, 14, 45);
  doc.text(`${t('accounting.reports.asOfDate')}: ${new Date(entry.entry_date).toLocaleDateString()}`, 14, 51);
  doc.text(`Type: ${entry.entry_type}`, 14, 57);
  doc.text(`Reference: ${entry.reference || 'N/A'}`, 14, 63);
  doc.text(`${t('accounting.reports.description')}: ${entry.description}`, 14, 69);

  // Lines Table
  const tableData = entry.lines.map((line: any) => [
    `${line.account_code} - ${line.account_name}`,
    line.description || '',
    line.debit > 0 ? formatAmount(line.debit, settings.defaultCurrency) : '',
    line.credit > 0 ? formatAmount(line.credit, settings.defaultCurrency) : '',
  ]);

  const totalDebit = entry.lines.reduce((sum: number, l: any) => sum + l.debit, 0);
  const totalCredit = entry.lines.reduce((sum: number, l: any) => sum + l.credit, 0);

  tableData.push([
    { content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold' } },
    { content: formatAmount(totalDebit, settings.defaultCurrency), styles: { fontStyle: 'bold' } },
    { content: formatAmount(totalCredit, settings.defaultCurrency), styles: { fontStyle: 'bold' } },
  ]);

  autoTable(doc, {
    startY: 75,
    head: [[t('accounting.reports.account'), t('accounting.reports.description'), t('accounting.reports.debit'), t('accounting.reports.credit')]],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [66, 66, 66] },
    margin: { top: 45 }
  });

  await addUniversalHeaderAndFooter(doc, 'Journal Entry', userInfo, settings, lang);

  return doc;
}

// Generate Profit & Loss PDF
export async function generateProfitLossPDF(report: any, settings: Settings, userInfo?: { name: string }, lang: string = 'en') {
  const doc = new jsPDF();
  const t = (key: string) => getTranslation(key, lang);

  doc.setFontSize(10);
  const periodStartY = 45;
  doc.text(`${t('accounting.reports.period')}: ${new Date(report.period.start).toLocaleDateString()} - ${new Date(report.period.end).toLocaleDateString()}`, 14, periodStartY);

  // Revenue Section
  const revenueData = report.revenue.map((item: any) => [
    `${item.account_code} - ${item.account_name}`,
    formatAmount(item.balance, settings.defaultCurrency),
  ]);

  if (revenueData.length > 0) {
    doc.setFontSize(12);
    doc.text(t('accounting.reports.revenue'), 14, periodStartY + 10);

    autoTable(doc, {
      startY: periodStartY + 15,
      body: revenueData,
      theme: 'plain',
      columnStyles: {
        0: { cellWidth: 130 },
        1: { halign: 'right', cellWidth: 50 },
      },
      margin: { top: 45 }
    });
  }

  const revenueEndY = (doc as any).lastAutoTable?.finalY || periodStartY + 15;

  // Total Revenue
  autoTable(doc, {
    startY: revenueEndY + 2,
    body: [[{ content: t('accounting.reports.totalRevenue'), styles: { fontStyle: 'bold' } }, { content: formatAmount(report.totalRevenue, settings.defaultCurrency), styles: { fontStyle: 'bold' } }]],
    theme: 'plain',
    columnStyles: {
      0: { cellWidth: 130 },
      1: { halign: 'right', cellWidth: 50 },
    },
    styles: { fillColor: [240, 240, 240] },
    margin: { top: 45 }
  });

  const expenseStartY = (doc as any).lastAutoTable.finalY + 10;

  // Expenses Section
  const expenseData = report.expenses.map((item: any) => [
    `${item.account_code} - ${item.account_name}`,
    formatAmount(item.balance, settings.defaultCurrency),
  ]);

  if (expenseData.length > 0) {
    doc.setFontSize(12);
    doc.text(t('accounting.reports.expenses'), 14, expenseStartY);

    autoTable(doc, {
      startY: expenseStartY + 5,
      body: expenseData,
      theme: 'plain',
      columnStyles: {
        0: { cellWidth: 130 },
        1: { halign: 'right', cellWidth: 50 },
      },
      margin: { top: 45 }
    });
  }

  const expenseEndY = (doc as any).lastAutoTable?.finalY || expenseStartY + 5;

  // Total Expenses
  autoTable(doc, {
    startY: expenseEndY + 2,
    body: [[{ content: t('accounting.reports.totalExpenses'), styles: { fontStyle: 'bold' } }, { content: formatAmount(report.totalExpenses, settings.defaultCurrency), styles: { fontStyle: 'bold' } }]],
    theme: 'plain',
    columnStyles: {
      0: { cellWidth: 130 },
      1: { halign: 'right', cellWidth: 50 },
    },
    styles: { fillColor: [240, 240, 240] },
    margin: { top: 45 }
  });

  const netIncomeY = (doc as any).lastAutoTable.finalY + 10;

  // Net Income
  autoTable(doc, {
    startY: netIncomeY,
    body: [[
      { content: t('accounting.reports.netIncome').toUpperCase(), styles: { fontStyle: 'bold', fontSize: 12 } },
      { content: formatAmount(report.netIncome, settings.defaultCurrency), styles: { fontStyle: 'bold', fontSize: 12, textColor: report.netIncome >= 0 ? [0, 128, 0] : [255, 0, 0] } }
    ]],
    theme: 'grid',
    columnStyles: {
      0: { cellWidth: 130 },
      1: { halign: 'right', cellWidth: 50 },
    },
    headStyles: { fillColor: [66, 66, 66] },
    margin: { top: 45 }
  });

  await addUniversalHeaderAndFooter(doc, t('accounting.reports.pnl'), userInfo, settings, lang);

  return doc;
}

// Generate Balance Sheet PDF
export async function generateBalanceSheetPDF(report: any, settings: Settings, userInfo?: { name: string }, lang: string = 'en') {
  const doc = new jsPDF();
  const t = (key: string) => getTranslation(key, lang);

  doc.setFontSize(10);
  const startY = 45;
  doc.text(`${t('accounting.reports.asOf')}: ${new Date(report.asOfDate).toLocaleDateString()}`, 14, startY);

  let currentY = startY + 15;

  // Assets
  if (report.assets.length > 0) {
    doc.setFontSize(12);
    doc.text(t('accounting.reports.assets'), 14, currentY);

    const assetsData = report.assets.map((item: any) => [
      `${item.account_code} - ${item.account_name}`,
      formatAmount(item.balance, settings.defaultCurrency),
    ]);

    autoTable(doc, {
      startY: currentY + 5,
      body: assetsData,
      theme: 'plain',
      columnStyles: {
        0: { cellWidth: 130 },
        1: { halign: 'right', cellWidth: 50 },
      },
      margin: { top: 45 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 2;
  }

  // Total Assets
  autoTable(doc, {
    startY: currentY,
    body: [[{ content: t('accounting.reports.totalAssets'), styles: { fontStyle: 'bold' } }, { content: formatAmount(report.totalAssets, settings.defaultCurrency), styles: { fontStyle: 'bold' } }]],
    theme: 'plain',
    columnStyles: {
      0: { cellWidth: 130 },
      1: { halign: 'right', cellWidth: 50 },
    },
    styles: { fillColor: [240, 240, 240] },
    margin: { top: 45 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Liabilities
  if (report.liabilities.length > 0) {
    doc.setFontSize(12);
    doc.text(t('accounting.reports.liabilities'), 14, currentY);

    const liabilitiesData = report.liabilities.map((item: any) => [
      `${item.account_code} - ${item.account_name}`,
      formatAmount(item.balance, settings.defaultCurrency),
    ]);

    autoTable(doc, {
      startY: currentY + 5,
      body: liabilitiesData,
      theme: 'plain',
      columnStyles: {
        0: { cellWidth: 130 },
        1: { halign: 'right', cellWidth: 50 },
      },
      margin: { top: 45 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 2;
  }

  // Total Liabilities
  autoTable(doc, {
    startY: currentY,
    body: [[{ content: t('accounting.reports.totalLiabilities'), styles: { fontStyle: 'bold' } }, { content: formatAmount(report.totalLiabilities, settings.defaultCurrency), styles: { fontStyle: 'bold' } }]],
    theme: 'plain',
    columnStyles: {
      0: { cellWidth: 130 },
      1: { halign: 'right', cellWidth: 50 },
    },
    styles: { fillColor: [240, 240, 240] },
    margin: { top: 45 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Equity
  if (report.equity.length > 0) {
    doc.setFontSize(12);
    doc.text(t('accounting.reports.equity'), 14, currentY);

    const equityData = report.equity.map((item: any) => [
      `${item.account_code} - ${item.account_name}`,
      formatAmount(item.balance, settings.defaultCurrency),
    ]);

    autoTable(doc, {
      startY: currentY + 5,
      body: equityData,
      theme: 'plain',
      columnStyles: {
        0: { cellWidth: 130 },
        1: { halign: 'right', cellWidth: 50 },
      },
      margin: { top: 45 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 2;
  }

  // Total Equity
  autoTable(doc, {
    startY: currentY,
    body: [[{ content: t('accounting.reports.totalEquity'), styles: { fontStyle: 'bold' } }, { content: formatAmount(report.totalEquity, settings.defaultCurrency), styles: { fontStyle: 'bold' } }]],
    theme: 'plain',
    columnStyles: {
      0: { cellWidth: 130 },
      1: { halign: 'right', cellWidth: 50 },
    },
    styles: { fillColor: [240, 240, 240] },
    margin: { top: 45 }
  });

  await addUniversalHeaderAndFooter(doc, t('accounting.reports.balanceSheet'), userInfo, settings, lang);

  return doc;
}

// Generate Cash Flow PDF
export async function generateCashFlowPDF(report: any, settings: Settings, userInfo?: { name: string }, lang: string = 'en') {
  const doc = new jsPDF();
  const t = (key: string) => getTranslation(key, lang);

  doc.setFontSize(10);
  const startY = 45;
  doc.text(`${t('accounting.reports.period')}: ${new Date(report.period.start).toLocaleDateString()} - ${new Date(report.period.end).toLocaleDateString()}`, 14, startY);

  let currentY = startY + 15;

  // Operating Activities
  if (report.operating.length > 0) {
    doc.setFontSize(12);
    doc.text(t('accounting.reports.operatingActivities'), 14, currentY);

    const operatingData = report.operating.map((item: any) => [
      item.description,
      formatAmount(item.amount, settings.defaultCurrency),
    ]);

    autoTable(doc, {
      startY: currentY + 5,
      body: operatingData,
      theme: 'plain',
      columnStyles: {
        0: { cellWidth: 130 },
        1: { halign: 'right', cellWidth: 50 },
      },
      margin: { top: 45 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Summary
  const summaryData = [
    [t('accounting.reports.beginningCash'), formatAmount(report.beginningCash, settings.defaultCurrency)],
    [t('accounting.reports.netCashFlow'), formatAmount(report.netCashFlow, settings.defaultCurrency)],
    [{ content: t('accounting.reports.endingCash'), styles: { fontStyle: 'bold' as any } }, { content: formatAmount(report.endingCash, settings.defaultCurrency), styles: { fontStyle: 'bold' as any } }],
  ];

  autoTable(doc, {
    startY: currentY,
    body: summaryData,
    theme: 'grid',
    columnStyles: {
      0: { cellWidth: 130 },
      1: { halign: 'right', cellWidth: 50 },
    },
    headStyles: { fillColor: [66, 66, 66] },
    margin: { top: 45 }
  });

  await addUniversalHeaderAndFooter(doc, t('accounting.reports.cashFlow'), userInfo, settings, lang);

  return doc;
}
