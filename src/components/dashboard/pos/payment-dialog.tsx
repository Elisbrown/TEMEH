
"use client"

import React, { useState, useRef } from "react"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-translation"
import { type ReceiptProps } from './receipt'
import { Download } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { type Order, type OrderItem } from "@/context/order-context"
import { useSettings } from "@/context/settings-context";
import { useStaff } from "@/context/staff-context";
import { formatCurrency } from "@/lib/utils";

export type PaymentDetails = {
  paymentMethod: string;
  amountPaid: number;
  change: number;
  subtotal?: number;
  discount?: number;
  discountName?: string;
  tax?: number;
  total?: number;
}

type PaymentDialogProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  totalAmount: number
  onPaymentSuccess: (details: PaymentDetails) => void
  orderForReceipt: Omit<Order, 'id' | 'timestamp' | 'status'>,
  onClose: () => void;
  // Tax and discount information
  subtotal?: number;
  discount?: number;
  tax?: number;
  taxRate?: number;
  discountName?: string;
}

export function PaymentDialog({
  isOpen,
  onOpenChange,
  totalAmount,
  onPaymentSuccess,
  orderForReceipt,
  onClose,
  subtotal,
  discount,
  tax,
  taxRate,
  discountName,
}: PaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [amountPaid, setAmountPaid] = useState(totalAmount)
  const [change, setChange] = useState(0)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [receiptProps, setReceiptProps] = useState<ReceiptProps | null>(null);

  const { toast } = useToast()
  const { t } = useTranslation()
  const { user } = useAuth()
  const { settings } = useSettings();
  const { staff } = useStaff();

  const getBase64Image = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleDownloadReceipt = async () => {
    if (!receiptProps || !user) return;

    const doc = new jsPDF({
      unit: 'mm',
      format: [80, 297]
    });

    const pageWidth = 80;
    let currentY = 10;
    const margin = 5;

    doc.setFont('courier', 'normal');

    const centerText = (text: string, y: number, fontSize: number = 10, style: 'normal' | 'bold' = 'normal') => {
      doc.setFontSize(fontSize);
      doc.setFont('courier', style);
      const textWidth = doc.getTextWidth(text);
      const x = (pageWidth - textWidth) / 2;
      doc.text(text, x, y);
    };

    const drawDashedLine = (y: number) => {
      doc.setLineDashPattern([1, 1], 0);
      doc.line(margin, y, pageWidth - margin, y);
      doc.setLineDashPattern([], 0);
    };

    // Header - Logo logic
    if (settings.platformLogo) {
      try {
        const base64Logo = await getBase64Image(settings.platformLogo);
        // Small logo (12mm x 12mm) - Centered
        const logoSize = 12;
        const logoX = (pageWidth - logoSize) / 2;
        doc.addImage(base64Logo, 'PNG', logoX, currentY, logoSize, logoSize);
        currentY += logoSize + 4;
      } catch (e) {
        console.error('Failed to add logo to PDF:', e);
      }
    }

    doc.setFontSize(12);
    doc.setFont('courier', 'bold');
    centerText(settings.organizationName.toUpperCase(), currentY, 12, 'bold');
    currentY += 6;

    doc.setFontSize(9);
    doc.setFont('courier', 'normal');
    centerText(settings.contactAddress, currentY, 9, 'normal');
    currentY += 4;
    centerText(`Tel: ${settings.contactPhone}`, currentY, 9, 'normal');
    currentY += 5;

    if (settings.receiptHeader) {
      centerText(settings.receiptHeader, currentY, 9, 'normal');
      currentY += 5;
    }

    currentY += 6;
    drawDashedLine(currentY);
    currentY += 6;

    // Receipt Info
    doc.setFontSize(9);
    doc.setFont('courier', 'bold');
    doc.text(`RECEIPT:`, margin, currentY);
    doc.setFont('courier', 'normal');
    doc.text(`#${receiptProps.orderId.split('-').pop()}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 5;

    doc.setFont('courier', 'bold');
    doc.text(`DATE:`, margin, currentY);
    doc.setFont('courier', 'normal');
    doc.text(receiptProps.timestamp.toLocaleString(), pageWidth - margin, currentY, { align: 'right' });
    currentY += 5;

    doc.setFont('courier', 'bold');
    doc.text(`CASHIER:`, margin, currentY);
    doc.setFont('courier', 'normal');
    doc.text(user.name, pageWidth - margin, currentY, { align: 'right' });
    currentY += 5;

    // Custom Fields
    settings.receiptCustomFields.forEach(field => {
      doc.setFont('courier', 'bold');
      doc.text(`${field.label.toUpperCase()}:`, margin, currentY);
      doc.setFont('courier', 'normal');
      doc.text(field.value, pageWidth - margin, currentY, { align: 'right' });
      currentY += 5;
    });

    currentY += 1;
    drawDashedLine(currentY);
    currentY += 7;

    // Items
    receiptProps.items.forEach(item => {
      doc.setFont('courier', 'bold');
      doc.setFontSize(10);
      doc.text(item.name.toUpperCase(), margin, currentY);
      currentY += 5;

      doc.setFont('courier', 'normal');
      doc.setFontSize(9);
      const qtyPrice = `${item.quantity} x ${formatCurrency(item.price, settings.defaultCurrency)}`;
      doc.text(qtyPrice, margin, currentY);

      const itemTotal = formatCurrency(item.price * item.quantity, settings.defaultCurrency);
      doc.text(itemTotal, pageWidth - margin, currentY, { align: 'right' });
      currentY += 8;
    });

    drawDashedLine(currentY);
    currentY += 6;

    // Totals Section using autoTable
    autoTable(doc, {
      startY: currentY,
      body: [
        ['Subtotal:', formatCurrency(receiptProps.subtotal, settings.defaultCurrency)],
        [`Discount${receiptProps.discountName ? ` (${receiptProps.discountName})` : ''}:`, `-${formatCurrency(receiptProps.discount || 0, settings.defaultCurrency)}`],
        ['Tax:', formatCurrency(receiptProps.tax || 0, settings.defaultCurrency)],
      ],
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: { top: 1, bottom: 1, left: 0, right: 0 },
        font: 'courier'
      },
      columnStyles: {
        0: { cellWidth: 45, halign: 'left' },
        1: { cellWidth: 25, halign: 'right' }
      },
      margin: { left: margin, right: margin }
    });

    currentY = (doc as any).lastAutoTable.finalY + 2;

    // Solid Line before Total
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    doc.setLineWidth(0.2);
    currentY += 6;

    // Total
    doc.setFontSize(12);
    doc.setFont('courier', 'bold');
    doc.text(`TOTAL:`, margin, currentY);
    doc.text(formatCurrency(receiptProps.total, settings.defaultCurrency), pageWidth - margin, currentY, { align: 'right' });
    currentY += 6;

    drawDashedLine(currentY);
    currentY += 6;

    // Paid Info
    doc.setFontSize(10);
    doc.setFont('courier', 'normal');
    doc.text(`Paid (${receiptProps.paymentMethod}):`, margin, currentY);
    doc.text(formatCurrency(receiptProps.amountTendered || receiptProps.total, settings.defaultCurrency), pageWidth - margin, currentY, { align: 'right' });
    currentY += 4;

    if (receiptProps.change && receiptProps.change > 0) {
      doc.text(`Change:`, margin, currentY);
      doc.text(formatCurrency(receiptProps.change, settings.defaultCurrency), pageWidth - margin, currentY, { align: 'right' });
      currentY += 4;
    }
    currentY += 2;

    drawDashedLine(currentY);
    currentY += 10;

    // Footer
    centerText((settings.receiptFooter || 'THANK YOU FOR YOUR VISIT!').toUpperCase(), currentY, 10, 'bold');
    currentY += 5;
    centerText('Please come again!', currentY, 9);

    currentY += 8;
    drawDashedLine(currentY);
    currentY += 5;
    centerText('Software: TEMEH', currentY, 8, 'bold');
    currentY += 4;
    centerText('Developed by SIGALIX', currentY, 8);
    currentY += 4;
    centerText('+237 679 690 703 | sigalix.net', currentY, 7);

    // Save PDF
    doc.save(`Receipt_${receiptProps.orderId.split('-').pop()}.pdf`);

    toast({
      title: "Receipt Downloaded",
      description: `Receipt for order #${receiptProps.orderId.split('-').pop()} has been saved.`
    });
  };


  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    setAmountPaid(value)
    if (paymentMethod === "cash" && value >= totalAmount) {
      setChange(value - totalAmount)
    } else {
      setChange(0)
    }
  }

  const handleConfirmPayment = () => {
    if (!user) return;

    toast({
      title: t('toasts.paymentSuccess'),
      description: t('toasts.paymentSuccessDesc'),
    })

    const paymentDetails: PaymentDetails = {
      paymentMethod,
      amountPaid: paymentMethod === 'cash' ? amountPaid : totalAmount,
      change,
      subtotal,
      discount,
      discountName,
      tax,
      total: totalAmount
    };

    const finalReceiptProps: ReceiptProps = {
      type: 'Receipt',
      orderId: (orderForReceipt as Order).id || `PAY-${Date.now()}`,
      table: orderForReceipt.table,
      items: orderForReceipt.items,
      subtotal: subtotal || totalAmount,
      total: totalAmount,
      totalPaid: totalAmount,
      totalDue: 0,
      amountTendered: paymentDetails.amountPaid,
      change: paymentDetails.change,
      paymentMethod: paymentDetails.paymentMethod,
      timestamp: new Date(),
      cashierName: staff.find(s => parseInt(s.id) === (orderForReceipt as Order).cashier_id)?.name || user.name,
      settings: settings,
      // Pass tax and discount information
      discount,
      tax,
      taxRate,
      discountName,
    };
    setReceiptProps(finalReceiptProps)

    onPaymentSuccess(paymentDetails);
    setIsConfirmed(true)
    
    // Auto-trigger download after a small delay to ensure state is updated
    setTimeout(() => {
        handleDownloadReceipt();
    }, 500);
  }

  React.useEffect(() => {
    if (isOpen && !isConfirmed) {
      setAmountPaid(totalAmount)
      setChange(0)
      setPaymentMethod("cash")
      setIsConfirmed(false)
      setReceiptProps(null)
    }
  }, [isOpen])

  const handleCloseDialog = () => {
    onOpenChange(false);
    if (isConfirmed) {
      onClose();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">{isConfirmed ? "Payment Successful" : t('pos.completePaymentTitle')}</DialogTitle>
          <DialogDescription>
            {isConfirmed ? "You can now download the receipt or close this window." : t('pos.completePaymentDesc')}
          </DialogDescription>
        </DialogHeader>
        {!isConfirmed ? (
          <div className="space-y-4 py-4">
            <div className="text-4xl font-bold text-center">
              {formatCurrency(totalAmount, settings.defaultCurrency)}
            </div>
            <div className="space-y-2">
              <Label>{t('pos.paymentMethod')}</Label>
              <RadioGroup
                defaultValue="cash"
                className="grid grid-cols-3 gap-4"
                onValueChange={setPaymentMethod}
                value={paymentMethod}
              >
                <div>
                  <RadioGroupItem value="cash" id="cash" className="peer sr-only" />
                  <Label
                    htmlFor="cash"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    {t('pos.cash')}
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="card"
                    id="card"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="card"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    {t('pos.card')}
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="mobile"
                    id="mobile"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="mobile"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    {t('pos.mobile')}
                  </Label>
                </div>
              </RadioGroup>
            </div>
            {paymentMethod === 'cash' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount-paid">{t('pos.amountPaid')}</Label>
                  <Input id="amount-paid" type="number" value={amountPaid} onChange={handleAmountChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="change">{t('pos.change')}</Label>
                  <Input id="change" type="number" value={change} readOnly className="font-bold" />
                </div>
              </div>
            )}
            {paymentMethod !== 'cash' && (
              <div className="space-y-2">
                <Label htmlFor="reference">{t('pos.reference')}</Label>
                <Input id="reference" placeholder={t('pos.referencePlaceholder')} />
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p>Order has been finalized.</p>
          </div>
        )}
        <DialogFooter>
          {isConfirmed ? (
            <>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Close
              </Button>
              <Button type="button" onClick={handleDownloadReceipt} disabled={!receiptProps}>
                <Download className="mr-2 h-4 w-4" /> {t('orders.downloadReceipt')}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('dialogs.cancel')}
              </Button>
              <Button type="button" onClick={handleConfirmPayment} disabled={paymentMethod === 'cash' && amountPaid < totalAmount}>
                {t('pos.confirmPayment')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
