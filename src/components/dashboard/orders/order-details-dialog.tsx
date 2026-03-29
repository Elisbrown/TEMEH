
"use client"

import React, { useState, useRef } from "react"
import { formatDistanceToNow } from 'date-fns'
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { formatCurrency } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useOrders, type Order } from "@/context/order-context"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/context/auth-context"
import { useTranslation } from "@/hooks/use-translation"
import { PaymentDialog, type PaymentDetails } from "@/components/dashboard/pos/payment-dialog"
import { SplitOrderDialog } from "./split-order-dialog"
import { MergeOrderDialog } from "./merge-order-dialog"
import { MinusCircle, PlusCircle, Trash2, Download, AlertCircle, Edit, Check, X } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { CancelOrderDialog } from "../cancel-order-dialog";
import { useStaff } from "@/context/staff-context";
import { useActivityLog } from "@/context/activity-log-context";
import { useSettings } from "@/context/settings-context";


export function OrderDetailsDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { updateOrder, updateOrderStatus } = useOrders()
  const { toast } = useToast()
  const { user } = useAuth()
  const { t } = useTranslation()
  const { settings } = useSettings();
  const { logActivity } = useActivityLog();
  const { staff } = useStaff();

  const [isPaymentOpen, setPaymentOpen] = useState(false)
  const [isSplitOpen, setSplitOpen] = useState(false)
  const [isMergeOpen, setMergeOpen] = useState(false)
  const [isCancelOpen, setCancelOpen] = useState(false)
  const [editableOrder, setEditableOrder] = useState<Order | null>(order)
  const [isEditingPayment, setIsEditingPayment] = useState(false)
  const [editPaymentMethod, setEditPaymentMethod] = useState(order?.payment_method || '')

  const canEditPayment = user?.role === 'Manager' || user?.role === 'Super Admin'

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
    if (!editableOrder || !user) return;

    // Initializing PDF with thermal-like width (80mm)
    const doc = new jsPDF({
      unit: 'mm',
      format: [80, 297] // Standard A4 length but we only use what we need
    });

    const pageWidth = 80;
    let currentY = 10;
    const margin = 5;
    const contentWidth = pageWidth - (margin * 2);

    // Font setup - Use Courier for that monospaced receipt look
    doc.setFont('courier', 'normal');

    // Helper for centering text
    const centerText = (text: string, y: number, fontSize: number = 10, style: 'normal' | 'bold' = 'normal') => {
      doc.setFontSize(fontSize);
      doc.setFont('courier', style);
      // Use jsPDF's built-in alignment
      doc.text(text, pageWidth / 2, y, { align: 'center' });
    };

    // Helper for dashed line
    const drawDashedLine = (y: number) => {
      doc.setLineDashPattern([1, 1], 0);
      doc.line(margin, y, pageWidth - margin, y);
      doc.setLineDashPattern([], 0); // reset
    };

    // Header - Logo logic
    if (settings.platformLogo) {
      try {
        const base64Logo = await getBase64Image(settings.platformLogo);
        const logoSize = 12;
        const logoX = (pageWidth - logoSize) / 2;
        doc.addImage(base64Logo, 'PNG', logoX, currentY, logoSize, logoSize);
        currentY += logoSize + 4;
      } catch (e) {
        console.error('Failed to add logo to PDF:', e);
      }
    }

    centerText(settings.organizationName.toUpperCase(), currentY, 12, 'bold');
    currentY += 6;

    centerText(settings.contactAddress, currentY, 9, 'normal');
    currentY += 4;
    centerText(`Tel: ${settings.contactPhone}`, currentY, 9, 'normal');
    currentY += 5;

    if (settings.receiptHeader) {
      centerText(settings.receiptHeader, currentY, 9, 'normal');
      currentY += 5;
    }

    currentY += 2;
    drawDashedLine(currentY);
    currentY += 6;

    // Order Info
    doc.setFontSize(9);
    doc.setFont('courier', 'bold');
    doc.text(`RECEIPT:`, margin, currentY);
    doc.setFont('courier', 'normal');
    doc.text(`#${editableOrder.id.split('-').pop()}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 5;

    doc.setFont('courier', 'bold');
    doc.text(`DATE:`, margin, currentY);
    doc.setFont('courier', 'normal');
    const dateStr = new Date().toLocaleString();
    doc.text(dateStr, pageWidth - margin, currentY, { align: 'right' });
    currentY += 5;

    doc.setFont('courier', 'bold');
    doc.text(`CASHIER:`, margin, currentY);
    doc.setFont('courier', 'normal');
    doc.text(user.name, pageWidth - margin, currentY, { align: 'right' });
    currentY += 5;

    const cashier = staff.find(s => parseInt(s.id) === editableOrder.cashier_id);
    const cashierName = cashier?.name;

    if (settings.receiptShowWaiter && cashierName) {
      doc.setFont('courier', 'bold');
      doc.text(`WAITER:`, margin, currentY);
      doc.setFont('courier', 'normal');
      doc.text(cashierName, pageWidth - margin, currentY, { align: 'right' });
      currentY += 5;
    }

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

    // Items - Manual Rendering for exact look
    editableOrder.items.forEach(item => {
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

    // Recalculate totals precisely for the document to avoid any scope shadowing
    const docSubtotal = editableOrder.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const docDiscount = editableOrder.discount || 0;
    const docTax = editableOrder.tax || 0;
    const docTotal = docSubtotal - docDiscount + docTax;

    // Totals Section using autoTable for perfect alignment & no overlap
    autoTable(doc, {
      startY: currentY,
      body: [
        ['Subtotal:', formatCurrency(docSubtotal, settings.defaultCurrency)],
        [`Discount${editableOrder.discountName ? ` (${editableOrder.discountName})` : ''}:`, `-${formatCurrency(docDiscount, settings.defaultCurrency)}`],
        ['Tax:', formatCurrency(docTax, settings.defaultCurrency)],
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
    doc.text(formatCurrency(docTotal, settings.defaultCurrency), pageWidth - margin, currentY, { align: 'right' });
    currentY += 6;

    drawDashedLine(currentY);
    currentY += 6;

    // Payment/Due Info
    doc.setFontSize(10);
    doc.setFont('courier', 'normal');

    if (editableOrder.status === 'Completed') {
      doc.text(`Paid (Cash):`, margin, currentY);
      doc.text(formatCurrency(docTotal, settings.defaultCurrency), pageWidth - margin, currentY, { align: 'right' });
      currentY += 6;
      doc.text(`Amount Due:`, margin, currentY);
      doc.text(formatCurrency(0, settings.defaultCurrency), pageWidth - margin, currentY, { align: 'right' });
    } else {
      doc.text(`Paid:`, margin, currentY);
      doc.text(formatCurrency(0, settings.defaultCurrency), pageWidth - margin, currentY, { align: 'right' });
      currentY += 6;
      doc.setFont('courier', 'bold');
      doc.text(`AMOUNT DUE:`, margin, currentY);
      doc.text(formatCurrency(docTotal, settings.defaultCurrency), pageWidth - margin, currentY, { align: 'right' });
    }
    currentY += 6;

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

    // Final height adjustment - jsPDF doesn't resize the page easily after creation, but we can set it during creation if we knew the height.
    // For thermal printers, we usually just want the content.

    // Save PDF
    doc.save(`Receipt_${editableOrder.id.split('-').pop()}.pdf`);

    toast({
      title: "Receipt Downloaded",
      description: `Receipt for order #${editableOrder.id.split('-').pop()} has been saved.`
    });
  };


  React.useEffect(() => {
    setEditableOrder(order)
    setEditPaymentMethod(order?.payment_method || '')
    setIsEditingPayment(false)
  }, [order])

  const handleSavePaymentMethod = async () => {
    if (!editableOrder) return;
    try {
      const updated = { ...editableOrder, payment_method: editPaymentMethod };
      await updateOrder(updated);
      setEditableOrder(updated);
      setIsEditingPayment(false);
      toast({
        title: t('toasts.orderUpdated'),
        description: t('orders.paymentMethodUpdated') || `Payment method updated to ${editPaymentMethod}.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('toasts.updateFailed'),
        description: error.message || 'Failed to update payment method.',
      });
    }
  }


  if (!order || !editableOrder) return null

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Pending": return "destructive"
      case "In Progress": return "secondary"
      case "Ready": return "default"
      default: return "outline"
    }
  }

  const itemsSubtotal = editableOrder.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = itemsSubtotal - (editableOrder.discount || 0) + (editableOrder.tax || 0);

  const handlePaymentSuccess = (paymentDetails: PaymentDetails) => {
    if (!user) return;
    updateOrderStatus(editableOrder.id, "Completed")
  }

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    setEditableOrder(prev => {
      if (!prev) return null;
      const newItems = prev.items.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ).filter(item => item.quantity > 0);
      return { ...prev, items: newItems };
    });
  }


  const handleCancelConfirm = async (reason: string) => {
    if (editableOrder && user) {
      const currentStaff = staff.find(s => s.email === user.email);
      const userId = currentStaff ? parseInt(currentStaff.id) : undefined;

      await updateOrderStatus(editableOrder.id, 'Canceled', {
        cancelled_by: userId,
        reason: reason
      });

      await logActivity('cancel_order', `Order ${editableOrder.id} canceled by ${user.name}. Reason: ${reason}`);

      toast({
        title: t('toasts.orderCanceled'),
        description: t('toasts.orderCanceledDesc', { orderId: editableOrder.id }),
        variant: "destructive"
      });
      setCancelOpen(false);
      onOpenChange(false);
    }
  }

  const handleSaveChanges = async () => {
    if (JSON.stringify(order) !== JSON.stringify(editableOrder)) {
      try {
        await updateOrder(editableOrder)
        toast({
          title: t('toasts.orderUpdated'),
          description: t('toasts.orderUpdatedDesc', { orderId: editableOrder.id })
        })
        onOpenChange(false)
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: t('toasts.updateFailed'),
          description: error.message || t('toasts.orderUpdateError')
        })
      }
    } else {
      onOpenChange(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline">{t('orders.orderDetailsTitle', { orderId: order.id })}</DialogTitle>
            <DialogDescription>
              {t('orders.orderDetailsDescNoTable', { time: formatDistanceToNow(order.timestamp, { addSuffix: true }) }) || `Order placed ${formatDistanceToNow(order.timestamp, { addSuffix: true })}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
            <div className="flex items-center space-x-4">
              <p className="font-medium">{t('inventory.status')}:</p>
              <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
            </div>

            {/* Cancellation Details */}
            {order.status === 'Canceled' && (
              <div className="bg-destructive/10 p-3 rounded-md border border-destructive/20 text-sm">
                <p className="font-bold text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {t('orders.orderCanceled') || 'Order Canceled'}
                </p>
                <div className="mt-2 text-muted-foreground space-y-1">
                  <p><span className="font-medium">{t('common.by') || 'By'}:</span> {staff.find(s => parseInt(s.id) === order.cancelled_by)?.name || 'Unknown'}</p>
                  <p><span className="font-medium">{t('common.reason') || 'Reason'}:</span> {order.cancellation_reason}</p>
                  {order.cancelled_at && (
                    <p><span className="font-medium">{t('common.time') || 'Time'}:</span> {formatDistanceToNow(new Date(order.cancelled_at), { addSuffix: true })}</p>
                  )}
                </div>
              </div>
            )}

            {/* Payment Method Section */}
            {order.status === 'Completed' && (
              <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
                <div>
                  <p className="text-sm text-muted-foreground">{t('pos.paymentMethod')}</p>
                  {isEditingPayment ? (
                    <div className="mt-2">
                      <RadioGroup
                        value={editPaymentMethod}
                        onValueChange={setEditPaymentMethod}
                        className="flex gap-3"
                      >
                        {['cash', 'card', 'mobile'].map(method => (
                          <div key={method} className="flex items-center space-x-1">
                            <RadioGroupItem value={method} id={`edit-${method}`} />
                            <Label htmlFor={`edit-${method}`} className="text-sm capitalize cursor-pointer">
                              {t(`pos.${method}`)}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="default" className="h-7 gap-1" onClick={handleSavePaymentMethod}>
                          <Check className="h-3 w-3" /> {t('common.save')}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => { setIsEditingPayment(false); setEditPaymentMethod(editableOrder?.payment_method || ''); }}>
                          <X className="h-3 w-3" /> {t('common.cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="font-medium capitalize">{editableOrder?.payment_method || '—'}</p>
                  )}
                </div>
                {canEditPayment && !isEditingPayment && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setIsEditingPayment(true)}>
                    <Edit className="h-3 w-3" /> {t('orders.editPaymentMethod') || 'Edit'}
                  </Button>
                )}
              </div>
            )}

            <Separator />

            <div className={`space-y-4 ${order.status === 'Canceled' || order.status === 'Completed' ? 'opacity-60 pointer-events-none' : ''}`}>
              {editableOrder.items.map((item, index) => (
                <div key={`${item.id}-${index}`} className="flex items-center">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.price, settings.defaultCurrency)}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="font-bold">x{item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-1 pt-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{t('pos.subtotal')}</span>
                <span>{formatCurrency(itemsSubtotal, settings.defaultCurrency)}</span>
              </div>

              <div className="flex justify-between text-sm text-green-600">
                <span>
                  {t('pos.discount')}
                  {editableOrder.discountName ? ` (${editableOrder.discountName})` : ''}
                </span>
                <span>-{formatCurrency(editableOrder.discount || 0, settings.defaultCurrency)}</span>
              </div>

              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{t('pos.tax')}</span>
                <span>{formatCurrency(editableOrder.tax || 0, settings.defaultCurrency)}</span>
              </div>

              <Separator className="my-1" />

              <div className="flex w-full justify-between font-bold text-lg pt-1">
                <span>{t('pos.total')}</span>
                <span className="text-primary">{formatCurrency(total, settings.defaultCurrency)}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
            <div className="flex sm:justify-end gap-2 w-full flex-wrap">
              <Button variant="outline" onClick={handleDownloadReceipt}><Download className="mr-2 h-4 w-4" /> {t('orders.downloadReceipt')}</Button>

              {order.status !== 'Canceled' && order.status !== 'Completed' && (
                <>
                  <Button variant="secondary" onClick={() => setSplitOpen(true)}>{t('orders.splitOrder')}</Button>
                  <Button variant="secondary" onClick={() => setMergeOpen(true)}>{t('orders.mergeOrder')}</Button>
                  <div className="flex gap-2">
                    <Button variant="destructive" onClick={() => setCancelOpen(true)}>{t('orders.cancelOrder')}</Button>
                    <Button className="bg-green-700 hover:bg-green-800 text-white" onClick={() => setPaymentOpen(true)}>{t('pos.chargeOrder')}</Button>
                  </div>
                </>
              )}

              {order.status === 'Canceled' && (
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={async () => {
                    await updateOrderStatus(order.id, 'Pending');
                    await logActivity('reactivate_order', `Order ${order.id} reactivated by ${user?.name}.`, order.id, { previousStatus: 'Canceled', reactivatedBy: user?.name });
                    toast({ title: t('toasts.orderReactivated'), description: t('toasts.orderReactivatedDesc', { orderId: order.id }) });
                    onOpenChange(false);
                  }}
                >
                  {t('orders.reactivateOrder') || 'Reactivate Order'}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentDialog
        isOpen={isPaymentOpen}
        onOpenChange={setPaymentOpen}
        totalAmount={total}
        onPaymentSuccess={handlePaymentSuccess}
        orderForReceipt={editableOrder}
        onClose={() => onOpenChange(false)}
      />

      {editableOrder && (
        <>
          <SplitOrderDialog
            order={editableOrder}
            open={isSplitOpen}
            onOpenChange={setSplitOpen}
          />
          <MergeOrderDialog
            order={editableOrder}
            open={isMergeOpen}
            onOpenChange={setMergeOpen}
          />
          <CancelOrderDialog
            open={isCancelOpen}
            onOpenChange={setCancelOpen}
            onConfirm={handleCancelConfirm}
            orderId={editableOrder.id}
          />
        </>
      )}

    </>
  )
}
