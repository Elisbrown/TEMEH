// src/lib/thermal-printer.ts
// Thermal Printer Optimization Utility for 58mm/80mm receipt printers

export type PrinterWidth = '58mm' | '80mm';

export type ReceiptData = {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  orderId: string;
  date: string;
  cashier?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  paymentMethod?: string;
  amountPaid?: number;
  change?: number;
  footer?: string;
};

// Character widths for different printer sizes
const CHAR_WIDTHS: Record<PrinterWidth, number> = {
  '58mm': 32,  // ~32 characters
  '80mm': 48,  // ~48 characters
};

// ESC/POS commands
const ESC = '\x1B';
const GS = '\x1D';

export const ESC_POS = {
  INIT: ESC + '@',                    // Initialize printer
  CUT: GS + 'V\x00',                  // Full cut
  PARTIAL_CUT: GS + 'V\x01',          // Partial cut
  CENTER: ESC + 'a\x01',              // Center align
  LEFT: ESC + 'a\x00',                // Left align
  RIGHT: ESC + 'a\x02',               // Right align
  BOLD_ON: ESC + 'E\x01',             // Bold on
  BOLD_OFF: ESC + 'E\x00',            // Bold off
  DOUBLE_HEIGHT: ESC + '!\x10',       // Double height
  DOUBLE_WIDTH: ESC + '!\x20',        // Double width
  DOUBLE_SIZE: ESC + '!\x30',         // Double height + width
  NORMAL_SIZE: ESC + '!\x00',         // Normal size
  UNDERLINE_ON: ESC + '-\x01',        // Underline on
  UNDERLINE_OFF: ESC + '-\x00',       // Underline off
  FEED_LINES: (n: number) => ESC + 'd' + String.fromCharCode(n),
};

/**
 * Truncate or pad a string to fit the specified width
 */
export function fitString(str: string, width: number, align: 'left' | 'right' | 'center' = 'left'): string {
  if (str.length > width) {
    return str.substring(0, width - 1) + '…';
  }
  
  const padding = width - str.length;
  switch (align) {
    case 'right':
      return ' '.repeat(padding) + str;
    case 'center':
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
    default:
      return str + ' '.repeat(padding);
  }
}

/**
 * Format a line with item name on left and price on right
 */
export function formatItemLine(name: string, quantity: number, price: number, width: number): string {
  const priceStr = price.toLocaleString();
  const qtyStr = `${quantity}x`;
  // Reserve space for qty (5), price (10), and spacing
  const nameWidth = width - 16;
  const truncatedName = name.length > nameWidth ? name.substring(0, nameWidth - 1) + '…' : name;
  
  const line = `${qtyStr.padEnd(5)}${truncatedName}`;
  return line.padEnd(width - priceStr.length) + priceStr;
}

/**
 * Create a separator line
 */
export function createSeparator(width: number, char: string = '-'): string {
  return char.repeat(width);
}

/**
 * Format currency for receipt display
 */
export function formatCurrency(amount: number, symbol: string = ''): string {
  return `${symbol}${amount.toLocaleString()}`;
}

/**
 * Generate optimized receipt content for thermal printing
 */
export function generateReceiptContent(data: ReceiptData, printerWidth: PrinterWidth, currency: string = 'XAF'): string {
  const width = CHAR_WIDTHS[printerWidth];
  const lines: string[] = [];
  
  // Header
  lines.push(fitString(data.storeName.toUpperCase(), width, 'center'));
  if (data.storeAddress) {
    lines.push(fitString(data.storeAddress, width, 'center'));
  }
  if (data.storePhone) {
    lines.push(fitString(`Tel: ${data.storePhone}`, width, 'center'));
  }
  
  lines.push(createSeparator(width, '='));
  
  // Order info
  lines.push(fitString(`Order: ${data.orderId}`, width, 'left'));
  lines.push(fitString(`Date: ${data.date}`, width, 'left'));
  if (data.cashier) {
    lines.push(fitString(`Cashier: ${data.cashier}`, width, 'left'));
  }
  
  lines.push(createSeparator(width));
  
  // Items
  for (const item of data.items) {
    lines.push(formatItemLine(item.name, item.quantity, item.total, width));
  }
  
  lines.push(createSeparator(width));
  
  // Totals
  const labelWidth = Math.floor(width * 0.6);
  const amountWidth = width - labelWidth;
  
  lines.push(
    fitString('Subtotal:', labelWidth, 'left') +
    fitString(formatCurrency(data.subtotal, currency + ' '), amountWidth, 'right')
  );
  
  if (data.tax) {
    lines.push(
      fitString('Tax:', labelWidth, 'left') +
      fitString(formatCurrency(data.tax, currency + ' '), amountWidth, 'right')
    );
  }
  
  if (data.discount) {
    lines.push(
      fitString('Discount:', labelWidth, 'left') +
      fitString(`-${formatCurrency(data.discount, currency + ' ')}`, amountWidth, 'right')
    );
  }
  
  lines.push(createSeparator(width, '='));
  
  lines.push(
    fitString('TOTAL:', labelWidth, 'left') +
    fitString(formatCurrency(data.total, currency + ' '), amountWidth, 'right')
  );
  
  lines.push(createSeparator(width));
  
  // Payment info
  if (data.paymentMethod) {
    lines.push(fitString(`Payment: ${data.paymentMethod}`, width, 'left'));
  }
  if (data.amountPaid !== undefined) {
    lines.push(
      fitString('Paid:', labelWidth, 'left') +
      fitString(formatCurrency(data.amountPaid, currency + ' '), amountWidth, 'right')
    );
  }
  if (data.change !== undefined && data.change > 0) {
    lines.push(
      fitString('Change:', labelWidth, 'left') +
      fitString(formatCurrency(data.change, currency + ' '), amountWidth, 'right')
    );
  }
  
  lines.push('');
  
  // Footer
  if (data.footer) {
    lines.push(fitString(data.footer, width, 'center'));
  }
  lines.push(fitString('Thank you for your purchase!', width, 'center'));
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Generate ESC/POS commands for printing
 */
export function generateESCPOS(data: ReceiptData, printerWidth: PrinterWidth, currency: string = 'XAF'): string {
  const width = CHAR_WIDTHS[printerWidth];
  let output = ESC_POS.INIT;
  
  // Header (centered, bold, double size)
  output += ESC_POS.CENTER + ESC_POS.BOLD_ON + ESC_POS.DOUBLE_SIZE;
  output += data.storeName.toUpperCase() + '\n';
  output += ESC_POS.NORMAL_SIZE + ESC_POS.BOLD_OFF;
  
  if (data.storeAddress) {
    output += data.storeAddress + '\n';
  }
  if (data.storePhone) {
    output += `Tel: ${data.storePhone}\n`;
  }
  
  output += ESC_POS.LEFT;
  output += createSeparator(width, '=') + '\n';
  
  // Order info
  output += `Order: ${data.orderId}\n`;
  output += `Date: ${data.date}\n`;
  if (data.cashier) {
    output += `Cashier: ${data.cashier}\n`;
  }
  
  output += createSeparator(width) + '\n';
  
  // Items
  for (const item of data.items) {
    output += formatItemLine(item.name, item.quantity, item.total, width) + '\n';
  }
  
  output += createSeparator(width) + '\n';
  
  // Totals
  const labelWidth = Math.floor(width * 0.6);
  const amountWidth = width - labelWidth;
  
  output += fitString('Subtotal:', labelWidth) + 
            fitString(formatCurrency(data.subtotal, currency + ' '), amountWidth, 'right') + '\n';
  
  if (data.tax) {
    output += fitString('Tax:', labelWidth) + 
              fitString(formatCurrency(data.tax, currency + ' '), amountWidth, 'right') + '\n';
  }
  
  if (data.discount) {
    output += fitString('Discount:', labelWidth) + 
              fitString(`-${formatCurrency(data.discount, currency + ' ')}`, amountWidth, 'right') + '\n';
  }
  
  output += createSeparator(width, '=') + '\n';
  
  // Total (bold)
  output += ESC_POS.BOLD_ON;
  output += fitString('TOTAL:', labelWidth) + 
            fitString(formatCurrency(data.total, currency + ' '), amountWidth, 'right') + '\n';
  output += ESC_POS.BOLD_OFF;
  
  output += createSeparator(width) + '\n';
  
  // Payment info
  if (data.paymentMethod) {
    output += `Payment: ${data.paymentMethod}\n`;
  }
  if (data.amountPaid !== undefined) {
    output += fitString('Paid:', labelWidth) + 
              fitString(formatCurrency(data.amountPaid, currency + ' '), amountWidth, 'right') + '\n';
  }
  if (data.change !== undefined && data.change > 0) {
    output += fitString('Change:', labelWidth) + 
              fitString(formatCurrency(data.change, currency + ' '), amountWidth, 'right') + '\n';
  }
  
  output += '\n';
  
  // Footer (centered)
  output += ESC_POS.CENTER;
  if (data.footer) {
    output += data.footer + '\n';
  }
  output += 'Thank you for your purchase!\n';
  
  // Feed and cut
  output += ESC_POS.FEED_LINES(4);
  output += ESC_POS.PARTIAL_CUT;
  
  return output;
}

export default {
  generateReceiptContent,
  generateESCPOS,
  formatItemLine,
  fitString,
  createSeparator,
  formatCurrency,
  ESC_POS,
  CHAR_WIDTHS,
};
