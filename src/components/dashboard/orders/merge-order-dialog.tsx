
"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useOrders, type Order } from "@/context/order-context"
import { useTranslation } from "@/hooks/use-translation"

type MergeOrderDialogProps = {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MergeOrderDialog({ order, open, onOpenChange }: MergeOrderDialogProps) {
  const { orders, mergeOrders } = useOrders()
  const { t } = useTranslation()
  const [targetOrderId, setTargetOrderId] = useState<string | null>(null)

  const mergeableOrders = orders.filter(o => o.id !== order.id && o.status !== "Completed")

  const handleMerge = () => {
    if (!targetOrderId) return
    mergeOrders(order.id, targetOrderId)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('orders.mergeOrderTitle')}</DialogTitle>
          <DialogDescription>
            {t('orders.mergeOrderDesc', { orderId: order.id, table: order.table })}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <Label htmlFor="target-order">{t('orders.mergeWith')}</Label>
            <Select onValueChange={setTargetOrderId}>
              <SelectTrigger id="target-order">
                <SelectValue placeholder={t('orders.selectOrderPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {mergeableOrders.map(o => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.id} ({o.table})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('dialogs.cancel')}</Button>
          <Button onClick={handleMerge} disabled={!targetOrderId}>{t('orders.mergeOrder')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
