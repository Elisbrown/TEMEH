
"use client"

import React from 'react';
import { OrderItem } from './order-summary';
import { type Settings } from '@/context/settings-context';
import Image from 'next/image';
import { cn, formatCurrency } from '@/lib/utils';

function StoreIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
      <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" />
    </svg>
  )
}

export type ReceiptProps = {
  orderId: string;
  type: 'Invoice' | 'Receipt';
  table: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  totalPaid?: number;
  totalDue?: number;
  amountTendered?: number;
  change?: number;
  paymentMethod?: string;
  timestamp: Date;
  cashierName: string;
  settings: Settings; // Make settings mandatory for printing
  // Tax and discount breakdown
  discount?: number;
  tax?: number;
  taxRate?: number;
  discountName?: string;
};

export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(
  (props, ref) => {
    const {
      orderId, type, table, items, subtotal, total, totalPaid, totalDue, amountTendered, change, paymentMethod,
      timestamp, cashierName, settings, discount, tax, taxRate, discountName
    } = props;

    const fontClass = {
      mono: 'font-mono',
      sans: 'font-sans',
      serif: 'font-serif'
    }[settings.receiptFont] || 'font-mono';

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
      <div
        ref={ref}
        className={cn("p-4 bg-white text-black text-[12px] w-[302px] mx-auto", fontClass)}
        style={{ lineHeight: settings.receiptLineSpacing || 1.2, fontFamily: 'monospace' }}
      >
        {/* Header - Centered */}
        <div className="w-full text-center mb-4 space-y-1">
          <div className="flex items-center justify-center mb-2">
            {settings.platformLogo ? (
              <Image src={settings.platformLogo} alt="logo" width={50} height={50} className="h-12 w-12 object-contain" />
            ) : (
              <StoreIcon className="h-10 w-10 text-black mx-auto" />
            )}
          </div>
          <h1 className="text-base font-bold uppercase">{settings.organizationName || 'TEMEH Cold Store'}</h1>
          <p className="text-[11px] leading-tight">{settings.contactAddress}</p>
          <p className="text-[11px]">Tel: {settings.contactPhone}</p>
          {settings.receiptHeader && <p className="mt-1 text-[11px] font-medium">{settings.receiptHeader}</p>}
        </div>

        <div className="border-t border-dashed border-black my-2" />

        {/* Receipt Details - Left/Right */}
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="font-bold">{type === 'Invoice' ? 'INVOICE:' : 'RECEIPT:'}</span>
            <span>#{orderId.split('-').pop()}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">DATE:</span>
            <span>{timestamp.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">CASHIER:</span>
            <span>{cashierName}</span>
          </div>
          {settings.receiptShowWaiter && cashierName && (
             <div className="flex justify-between">
               <span className="font-bold">SERVED BY:</span>
               <span>{cashierName}</span>
             </div>
           )}
          {settings.receiptCustomFields.map((field, index) => (
            <div key={index} className="flex justify-between">
              <span className="font-bold">{field.label.toUpperCase()}:</span>
              <span>{field.value}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-black my-2" />

        {/* Items */}
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="space-y-0.5">
              <div className="font-bold uppercase">{item.name}</div>
              <div className="flex justify-between items-center text-[11px]">
                <span>
                    {item.quantity} {item.unit_type || ''} x {formatCurrency(item.price, settings.defaultCurrency)}
                </span>
                <span className="font-medium">{formatCurrency(item.price * item.quantity, settings.defaultCurrency)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-black my-2" />

        {/* Totals */}
        <div className="space-y-1.5 text-[12px]">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal, settings.defaultCurrency)}</span>
          </div>

          <div className="flex justify-between">
            <span>Discount{discountName ? ` (${discountName})` : ''}:</span>
            <span>-{formatCurrency(discount || 0, settings.defaultCurrency)}</span>
          </div>

          <div className="flex justify-between">
            <span>Tax{taxRate ? ` (${taxRate}%)` : ''}:</span>
            <span>{formatCurrency(tax || 0, settings.defaultCurrency)}</span>
          </div>

          <div className="border-t border-black my-1" />

          <div className="flex justify-between font-bold text-[14px]">
            <span>TOTAL:</span>
            <span>{formatCurrency(total, settings.defaultCurrency)}</span>
          </div>
        </div>

        {type === 'Receipt' && (
          <>
            <div className="border-t border-dashed border-black my-2" />
            <div className="space-y-1 text-[11px]">
              {amountTendered !== undefined && (
                <div className="flex justify-between">
                  <span>Paid ({paymentMethod}):</span>
                  <span>{formatCurrency(amountTendered, settings.defaultCurrency)}</span>
                </div>
              )}
              {change !== undefined && change > 0 && (
                <div className="flex justify-between">
                  <span>Change:</span>
                  <span>{formatCurrency(change, settings.defaultCurrency)}</span>
                </div>
              )}
            </div>
          </>
        )}

        <div className="border-t border-dashed border-black my-2" />

        {/* Footer - Centered */}
        <div className="text-center mt-4 space-y-2">
          <div className="space-y-0.5">
            <p className="font-bold uppercase text-[11px]">{settings.receiptFooter || 'Thank you for your business!'}</p>
            <p className="text-[10px]">Please come again!</p>
          </div>

          <div className="border-t border-dotted border-black/20 pt-2 space-y-0.5 opacity-70">
            <p className="text-[9px] font-medium">Software: TEMEH</p>
            <p className="text-[9px]">Developed by SIGALIX</p>
            <p className="text-[8px] whitespace-nowrap">+237 679 690 703 | sigalix.net</p>
          </div>
        </div>
      </div>
    );
  }
);

Receipt.displayName = 'Receipt';
