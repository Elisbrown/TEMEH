"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useInventory } from "@/context/inventory-context"
import { useSettings } from "@/context/settings-context"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-translation"
import { formatCurrency } from "@/lib/utils"
import type { InventoryItem } from "@/context/inventory-context"

interface StockMovementDialogProps {
  item: InventoryItem | null
  type: 'IN' | 'OUT'
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StockMovementDialog({ item, type, open, onOpenChange }: StockMovementDialogProps) {
  const { addMovement } = useInventory()
  const { settings } = useSettings()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    quantity: 0,
    unit_cost: 0,
    reference_number: '',
    reference_type: 'PURCHASE_ORDER' as const,
    notes: ''
  })

  useEffect(() => {
    if (open && item) {
      setFormData(prev => ({
        ...prev,
        unit_cost: item.cost_per_unit || 0
      }))
    }
  }, [open, item])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!item) return

    setLoading(true)

    try {
      await addMovement({
        item_id: item.id,
        movement_type: type,
        quantity: formData.quantity,
        unit_cost: formData.unit_cost || undefined,
        total_cost: formData.unit_cost ? formData.unit_cost * formData.quantity : undefined,
        reference_number: formData.reference_number || undefined,
        reference_type: formData.reference_type,
        notes: formData.notes || undefined
      })

      toast({
        title: t('toasts.success'),
        description: t('inventory.movementRecorded'),
      })
      
      onOpenChange(false)
      setFormData({
        quantity: 0,
        unit_cost: 0,
        reference_number: '',
        reference_type: 'PURCHASE_ORDER',
        notes: ''
      })
    } catch (error) {
      toast({
        title: t('toasts.error'),
        description: t('inventory.movementError'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const referenceTypeOptions = [
    { value: 'PURCHASE_ORDER', label: t('inventory.purchaseOrder') },
    { value: 'SALES_ORDER', label: t('inventory.salesOrder') },
    { value: 'ADJUSTMENT', label: t('inventory.adjustment') },
    { value: 'TRANSFER', label: t('inventory.transfer') },
    { value: 'WASTE', label: t('inventory.waste') },
    { value: 'THEFT', label: t('inventory.theft') },
    { value: 'DAMAGE', label: t('inventory.damage') }
  ]

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {type === 'IN' ? t('inventory.stockIn') : t('inventory.stockOut')} - {item.name}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">{t('inventory.quantity')} *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit_cost">{t('inventory.unitCost')}</Label>
            <Input
              id="unit_cost"
              type="number"
              min="0"
              step="0.01"
              value={formData.unit_cost}
              onChange={(e) => handleInputChange('unit_cost', parseFloat(e.target.value) || 0)}
            />
            {formData.unit_cost > 0 && formData.quantity > 0 && (
              <div className="text-sm text-muted-foreground">
                {t('inventory.totalCost')}: {formatCurrency(formData.unit_cost * formData.quantity, settings.defaultCurrency)}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference_type">{t('inventory.referenceType')}</Label>
            <Select 
              value={formData.reference_type} 
              onValueChange={(value: any) => handleInputChange('reference_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {referenceTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference_number">{t('inventory.referenceNumber')}</Label>
            <Input
              id="reference_number"
              value={formData.reference_number}
              onChange={(e) => handleInputChange('reference_number', e.target.value)}
              placeholder={t('inventory.referenceNumberPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('inventory.notes')}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              placeholder={t('inventory.notesPlaceholder')}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 