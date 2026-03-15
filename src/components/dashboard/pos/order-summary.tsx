
"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { PlusCircle, MinusCircle, Trash2, Percent, Tag, PauseCircle } from "lucide-react"
import { PaymentDialog, type PaymentDetails } from "./payment-dialog"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/context/auth-context"
import { useSettings } from "@/context/settings-context"
import { type ReceiptProps } from "./receipt"
import { type Order, type OrderItem } from "@/context/order-context"
import { calculateTotal, formatCurrency } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

type OrderSummaryProps = {
  items: OrderItem[]
  onUpdateQuantity: (id: string, quantity: number) => void
  onClearOrder: () => void
  onPaymentSuccess: (details: PaymentDetails) => void
  onPlaceOrder: (totals: { subtotal: number, tax: number, discount: number, total: number, discountName?: string }) => void
  onSuspendOrder?: () => void
  isPlacingOrder?: boolean
  hidePlaceOrderButton?: boolean
}

export function OrderSummary({ items, onUpdateQuantity, onClearOrder, onPaymentSuccess, onPlaceOrder, onSuspendOrder, isPlacingOrder = false, hidePlaceOrderButton = false }: OrderSummaryProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDiscountRule, setSelectedDiscountRule] = useState<string>("none")
  const { t } = useTranslation()
  const { user } = useAuth();
  const { settings } = useSettings();

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  // Get default tax rate
  const defaultTaxRate = settings.taxRates.find(rate => rate.isDefault)?.rate || 0

  // Get selected discount rule
  const selectedDiscount = selectedDiscountRule === "none" ? null : settings.discountRules.find(rule => rule.id === selectedDiscountRule)

  // Calculate totals with tax and discount
  const totals = calculateTotal(
    subtotal,
    settings.taxEnabled ? defaultTaxRate : 0,
    selectedDiscount?.type || 'percentage',
    selectedDiscount?.value || 0
  )

  const handleSuccessfulPayment = (details: PaymentDetails) => {
    onPaymentSuccess(details)
  }

  const isOrderEmpty = items.length === 0;

  const canPlaceOrder = () => {
    if (!user) return false;
    const allowedRoles = ["Waiter", "Manager", "Admin", "Super Admin", "Cashier", "Bartender"];
    return allowedRoles.includes(user.role)
  }

  const canProcessPayment = () => {
    if (!user) return false;
    const allowedRoles = ["Cashier", "Manager", "Admin", "Super Admin"];
    return allowedRoles.includes(user.role)
  }

  const orderForReceipt: Omit<Order, 'id' | 'timestamp' | 'status'> = {
    table: 'POS',
    items: items
  }

  // Reset discount when order is cleared
  const handleClearOrder = () => {
    setSelectedDiscountRule("none")
    onClearOrder()
  }

  const handleOnPlaceOrder = () => {
    onPlaceOrder({
      subtotal: totals.subtotal,
      tax: totals.tax,
      discount: totals.discount,
      total: totals.total,
      discountName: selectedDiscount?.name
    });
  }

  return (
    <>
      <Card className="flex h-full flex-col border-0 shadow-none overflow-hidden">
        <CardHeader className="flex-none pb-2">
          <CardTitle className="font-headline text-lg">{t('pos.currentOrder')}</CardTitle>
        </CardHeader>

        <CardContent className="flex-1 space-y-4 overflow-y-auto px-4 py-2 scrollbar-thin">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground opacity-50">
              <Trash2 className="h-10 w-10 mb-2" />
              <p className="font-medium">{t('pos.noItems')}</p>
              <p className="text-sm">{t('pos.getStarted')}</p>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {items.map((item) => (
                <div key={item.id} className={`flex items-center gap-3 bg-muted/30 p-2 rounded-lg group animate-in fade-in slide-in-from-right-2 duration-200 ${item.isPersisted ? 'opacity-75' : ''}`}>
                  <div className="relative h-12 w-12 flex-none translate-y-0.5">
                    <Image
                      src={item.image || "https://placehold.co/150x150.png"}
                      alt={item.name}
                      fill
                      className="rounded-md object-cover"
                    />
                    {item.isPersisted && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs truncate leading-tight uppercase tracking-tight">{item.name}</p>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">
                      {formatCurrency(item.price * item.quantity, settings.defaultCurrency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 bg-background/50 rounded-full p-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full hover:bg-muted"
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      disabled={isPlacingOrder || (item.persistedQuantity ? item.quantity <= item.persistedQuantity : item.quantity <= 1)}
                    >
                      <MinusCircle className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={item.quantity}
                      onChange={(e) => onUpdateQuantity(item.id, parseFloat(e.target.value) || 0)}
                      className="h-6 w-16 text-xs text-center p-0 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                     {item.unit_type && <span className="text-[10px] font-medium text-muted-foreground mr-1">{item.unit_type}</span>}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full hover:bg-muted"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      disabled={isPlacingOrder || (item.max_stock !== undefined && item.quantity >= item.max_stock)}
                    >
                      <PlusCircle className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onUpdateQuantity(item.id, item.persistedQuantity || 0)}
                    disabled={item.isPersisted || isPlacingOrder}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex-none flex-col gap-3 p-4 bg-muted/10 border-t">
          {/* Discount Selection */}
          {settings.discountEnabled && items.length > 0 && (
            <div className="w-full space-y-1.5">
              <div className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] uppercase font-black text-muted-foreground">{t('pos.discount')}</span>
              </div>
              <Select value={selectedDiscountRule} onValueChange={setSelectedDiscountRule} disabled={isPlacingOrder}>
                <SelectTrigger className="w-full h-9 text-xs bg-background">
                  <SelectValue placeholder={t('pos.selectDiscount')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('pos.noDiscount')}</SelectItem>
                  {settings.discountRules
                    .filter(rule => rule.isActive)
                    .map(rule => (
                      <SelectItem key={rule.id} value={rule.id}>
                        {rule.name} ({rule.type === 'percentage' ? `${rule.value}%` : formatCurrency(rule.value, settings.defaultCurrency)})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Price Breakdown */}
          <div className="w-full space-y-1 pt-1">
            <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
              <span>{t('pos.subtotal')}</span>
              <span>{formatCurrency(totals.subtotal, settings.defaultCurrency)}</span>
            </div>

            {totals.discount > 0 && (
              <div className="flex justify-between text-[11px] font-bold text-green-600">
                <span className="flex items-center gap-1"><Tag className="h-2.5 w-2.5" /> {selectedDiscount?.name || t('pos.discount')}</span>
                <span>-{formatCurrency(totals.discount, settings.defaultCurrency)}</span>
              </div>
            )}

            {settings.taxEnabled && totals.tax > 0 && (
              <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                <span>{t('pos.tax')} ({defaultTaxRate}%)</span>
                <span>{formatCurrency(totals.tax, settings.defaultCurrency)}</span>
              </div>
            )}

            <div className="flex justify-between font-black text-xl pt-1 mt-1 border-t border-muted-foreground/10">
              <span>{t('pos.total')}</span>
              <span className="text-primary">{formatCurrency(totals.total, settings.defaultCurrency)}</span>
            </div>
          </div>

          <div className="w-full flex gap-2 pt-1">
             <Button
               variant="outline"
               className="flex-none w-12 shadow-sm h-12 px-0"
               disabled={isOrderEmpty || isPlacingOrder}
               onClick={onSuspendOrder}
               title={t('pos.suspendSale') || "Suspend Sale"}
             >
               <PauseCircle className="h-5 w-5" />
             </Button>
            {!hidePlaceOrderButton && (
              <Button
                variant="outline"
                className="flex-1 shadow-sm font-bold uppercase text-[10px] tracking-widest h-12"
                disabled={isOrderEmpty || isPlacingOrder}
                onClick={handleOnPlaceOrder}
              >
                {isPlacingOrder ? "Sending..." : t('pos.placeOrder')}
              </Button>
            )}
            <Button
              className="flex-1 shadow-lg shadow-primary/20 font-bold uppercase text-[10px] tracking-widest h-12"
              disabled={isOrderEmpty || !canProcessPayment() || isPlacingOrder}
              onClick={() => setDialogOpen(true)}
            >
              {hidePlaceOrderButton ? (t('pos.completeSale') || 'Complete Sale') : t('pos.chargeOrder')}
            </Button>
          </div>
        </CardFooter>
      </Card>
      <PaymentDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        totalAmount={totals.total}
        onPaymentSuccess={handleSuccessfulPayment}
        orderForReceipt={orderForReceipt}
        onClose={() => setDialogOpen(false)}
        subtotal={totals.subtotal}
        discount={totals.discount}
        tax={totals.tax}
        taxRate={settings.taxEnabled ? defaultTaxRate : undefined}
        discountName={selectedDiscount?.name}
      />
    </>
  )
}

export { OrderItem }
