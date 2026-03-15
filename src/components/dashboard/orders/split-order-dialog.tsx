
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
import { useOrders, type Order, type OrderItem } from "@/context/order-context"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useTranslation } from "@/hooks/use-translation"

type SplitOrderDialogProps = {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SplitOrderDialog({ order, open, onOpenChange }: SplitOrderDialogProps) {
  const { splitOrder } = useOrders()
  const { t } = useTranslation()
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const handleToggleItem = (itemId: string, maxQty: number) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
      // Cleanup quantity
      const newQuantities = { ...quantities }
      delete newQuantities[itemId]
      setQuantities(newQuantities)
    } else {
      newSelected.add(itemId)
      // Default to max quantity (move all)
      setQuantities(prev => ({ ...prev, [itemId]: maxQty }))
    }
    setSelectedItems(newSelected)
  }

  const handleQuantityChange = (itemId: string, value: string, max: number) => {
    const qty = parseInt(value)
    if (isNaN(qty) || qty < 1) return

    // Clamp to max
    const validQty = Math.min(qty, max)
    setQuantities(prev => ({ ...prev, [itemId]: validQty }))

    // Ensure item is selected if quantity is interacted with
    if (!selectedItems.has(itemId)) {
      setSelectedItems(prev => new Set(prev).add(itemId))
    }
  }

  const handleSplit = () => {
    const itemsToSplit: OrderItem[] = []

    order.items.forEach(item => {
      if (selectedItems.has(item.id)) {
        const splitQty = quantities[item.id] || item.quantity
        itemsToSplit.push({
          ...item,
          quantity: splitQty
        })
      }
    })

    if (itemsToSplit.length === 0) return

    splitOrder(order.id, itemsToSplit)
    onOpenChange(false)
    // Reset state
    setSelectedItems(new Set())
    setQuantities({})
  }

  // Calculate if the split is valid (must move something, but not necessarily everything - though moving everything is technically a transfer)
  // We'll allow moving everything as it might be useful to "move" an order to a new ticket
  const isValidSplit = selectedItems.size > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('orders.splitOrderTitle')}</DialogTitle>
          <DialogDescription>
            {t('orders.splitOrderDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {order.items.map((item, index) => (
            <div key={`${item.id}-${index}`} className="flex items-center gap-3 p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
              <Checkbox
                id={`split-${item.id}-${index}`}
                checked={selectedItems.has(item.id)}
                onCheckedChange={() => handleToggleItem(item.id, item.quantity)}
                className="h-5 w-5"
              />
              <div className="flex-1 min-w-0">
                <Label htmlFor={`split-${item.id}-${index}`} className="cursor-pointer font-medium">
                  {item.name}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('common.price')}: XAF {item.price.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">
                  {t('common.qty')}: {item.quantity}
                </Label>
                {selectedItems.has(item.id) && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Split:</span>
                    <Input
                      type="number"
                      min="1"
                      max={item.quantity}
                      className="w-16 h-8 text-center px-1"
                      value={quantities[item.id] || item.quantity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleQuantityChange(item.id, e.target.value, item.quantity)}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('dialogs.cancel')}</Button>
          <Button
            onClick={handleSplit}
            disabled={!isValidSplit}
          >
            {t('orders.createNewOrder')} ({selectedItems.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
