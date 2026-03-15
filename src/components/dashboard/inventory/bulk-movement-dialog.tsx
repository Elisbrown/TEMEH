"use client"

import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useInventory } from "@/context/inventory-context"
import { useSettings } from "@/context/settings-context"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-translation"
import { formatCurrency } from "@/lib/utils"
import { Search, Trash2, ChevronRight, ChevronLeft, Plus, Minus } from "lucide-react"

interface BulkMovementDialogProps {
  type: 'IN' | 'OUT'
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BulkMovementDialog({ type, open, onOpenChange }: BulkMovementDialogProps) {
  const { items, addBulkMovements } = useInventory()
  const { settings } = useSettings()
  const { toast } = useToast()
  const { t } = useTranslation()

  const [step, setStep] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([])
  const [loading, setLoading] = useState(false)

  // Data for step 2
  const [movementData, setMovementData] = useState<Record<number, {
    quantity: number,
    unit_cost: number,
    notes: string
  }>>({})

  const filteredItems = useMemo(() => {
    return items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [items, searchTerm])

  const handleToggleItem = (id: number, itemPrice?: number) => {
    setSelectedItemIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(itemId => itemId !== id)
      } else {
        // Pre-fill movement data if it's the first time selecting
        if (!movementData[id]) {
          setMovementData(mPrev => ({
            ...mPrev,
            [id]: {
              quantity: 1,
              unit_cost: type === 'OUT' ? (itemPrice || 0) : 0,
              notes: ''
            }
          }))
        }
        return [...prev, id]
      }
    })
  }

  const handleRemoveItem = (id: number) => {
    setSelectedItemIds(prev => prev.filter(itemId => itemId !== id))
  }

  const handleUpdateMovement = (id: number, field: string, value: any) => {
    setMovementData(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }))
  }

  /* Step 2 Inputs */
  const [referenceType, setReferenceType] = useState<'PURCHASE_ORDER' | 'SALES_ORDER' | 'ADJUSTMENT' | 'TRANSFER' | 'WASTE' | 'THEFT' | 'DAMAGE'>('PURCHASE_ORDER');
  const [referenceNumber, setReferenceNumber] = useState('');

  const referenceTypeOptions = [
    { value: 'PURCHASE_ORDER', label: t('inventory.purchaseOrder') || 'Purchase Order' },
    { value: 'SALES_ORDER', label: t('inventory.salesOrder') || 'Sales Order' },
    { value: 'ADJUSTMENT', label: t('inventory.adjustment') || 'Adjustment' },
    { value: 'TRANSFER', label: t('inventory.transfer') || 'Transfer' },
    { value: 'WASTE', label: t('inventory.waste') || 'Waste' },
    { value: 'THEFT', label: t('inventory.theft') || 'Theft' },
    { value: 'DAMAGE', label: t('inventory.damage') || 'Damage' }
  ];

  const handleNext = () => {
    if (selectedItemIds.length === 0) {
      toast({
        title: t('toasts.error'),
        description: 'Please select at least one item',
        variant: 'destructive'
      })
      return
    }
    setStep(2)
  }

  const handleProcess = async () => {
    setLoading(true)
    try {
      const movements = selectedItemIds.map(id => ({
        item_id: id,
        movement_type: type,
        quantity: movementData[id].quantity,
        unit_cost: movementData[id].unit_cost,
        total_cost: movementData[id].unit_cost * movementData[id].quantity,
        reference_type: referenceType,
        reference_number: referenceNumber || undefined,
        notes: movementData[id].notes
      }))

      await addBulkMovements(movements)

      toast({
        title: t('toasts.success'),
        description: `Successfully processed stock ${type.toLowerCase()} for ${movements.length} items.`
      })

      handleReset()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: t('toasts.error'),
        description: 'Failed to process bulk movement',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setStep(1)
    setSelectedItemIds([])
    setMovementData({})
    setSearchTerm('')
    setReferenceNumber('')
    setReferenceType('PURCHASE_ORDER')
  }

  const selectedItems = items.filter(item => selectedItemIds.includes(item.id))

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) handleReset()
      onOpenChange(val)
    }}>
      <DialogContent className={step === 1 ? "max-w-md" : "max-w-4xl"}>
        <DialogHeader>
          <DialogTitle>
            {type === 'IN' ? t('inventory.bulkStockIn') || 'Bulk Stock In' : t('inventory.bulkStockOut') || 'Bulk Stock Out'}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Select items to include in this bulk operation.'
              : 'Enter quantities, costs, and reference details.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-md p-2">
              {filteredItems.map(item => (
                <div key={item.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md">
                  <Checkbox
                    id={`item-${item.id}`}
                    checked={selectedItemIds.includes(item.id)}
                    onCheckedChange={() => handleToggleItem(item.id, item.cost_per_unit)}
                  />
                  <label htmlFor={`item-${item.id}`} className="flex-1 text-sm cursor-pointer">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.sku} • Stock: {item.current_stock}</div>
                  </label>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground">No items found.</div>
              )}
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">{selectedItemIds.length} items selected</span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedItemIds([])}>Clear All</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reference Type</Label>
                <select
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={referenceType}
                  onChange={(e) => setReferenceType(e.target.value as any)}
                >
                  {referenceTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input
                  placeholder="e.g. PO-12345"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="border rounded-md overflow-hidden">
              <div className="max-h-[400px] overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground sticky top-0">
                    <tr>
                      <th className="p-3 text-left font-medium min-w-[200px]">Item</th>
                      <th className="p-3 text-left font-medium w-[120px]">Quantity</th>
                      <th className="p-3 text-left font-medium w-[150px]">Unit Cost ({settings.defaultCurrency.code})</th>
                      <th className="p-3 text-left font-medium w-[150px]">Total</th>
                      <th className="p-3 text-left font-medium min-w-[200px]">Notes</th>
                      <th className="p-3 text-center font-medium w-[50px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedItems.map(item => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="p-3">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.sku}</div>
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            className="h-8"
                            min="1"
                            value={movementData[item.id]?.quantity || 0}
                            onChange={(e) => handleUpdateMovement(item.id, 'quantity', parseInt(e.target.value) || 0)}
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            className="h-8"
                            min="0"
                            step="0.01"
                            value={movementData[item.id]?.unit_cost || 0}
                            onChange={(e) => handleUpdateMovement(item.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="p-3 font-medium">
                          {formatCurrency((movementData[item.id]?.quantity || 0) * (movementData[item.id]?.unit_cost || 0), settings.defaultCurrency)}
                        </td>
                        <td className="p-3">
                          <Input
                            placeholder="Add notes..."
                            className="h-8"
                            value={movementData[item.id]?.notes || ''}
                            onChange={(e) => handleUpdateMovement(item.id, 'notes', e.target.value)}
                          />
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)} className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            {step === 1 ? (
              <Button onClick={handleNext} className="gap-1">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleProcess} disabled={loading || selectedItemIds.length === 0}>
                {loading ? 'Processing...' : 'Process Movement'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
