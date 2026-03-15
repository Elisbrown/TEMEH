"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, Settings } from "lucide-react"
import { useInventory } from "@/context/inventory-context"
import { useTranslation } from "@/hooks/use-translation"
import type { InventoryItem, InventoryMovement } from "@/lib/db/inventory"

interface InventoryMovementsDialogProps {
  item: InventoryItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InventoryMovementsDialog({ item, open, onOpenChange }: InventoryMovementsDialogProps) {
  const { movements, fetchMovements, loading } = useInventory()
  const { t } = useTranslation()
  const [filteredMovements, setFilteredMovements] = useState<InventoryMovement[]>([])

  useEffect(() => {
    if (open && item) {
      fetchMovements(item.id)
    }
  }, [open, item?.id]) // Only depend on open and item.id, not fetchMovements

  useEffect(() => {
    if (item) {
      setFilteredMovements(movements.filter(m => m.item_id === item.id))
    }
  }, [movements, item?.id]) // Only depend on item.id, not entire item object

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'IN':
        return <ArrowUpRight className="h-4 w-4 text-green-600" />
      case 'OUT':
        return <ArrowDownRight className="h-4 w-4 text-red-600" />
      case 'TRANSFER':
        return <ArrowLeftRight className="h-4 w-4 text-blue-600" />
      case 'ADJUSTMENT':
        return <Settings className="h-4 w-4 text-orange-600" />
      default:
        return null
    }
  }

  const getMovementVariant = (type: string) => {
    switch (type) {
      case 'IN':
        return 'default'
      case 'OUT':
        return 'secondary'
      case 'TRANSFER':
        return 'outline'
      case 'ADJUSTMENT':
        return 'destructive'
      default:
        return 'default'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {t('inventory.movementsFor')} {item.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {loading.movements ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">{t('common.loading')}</div>
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">{t('inventory.noMovements')}</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>{t('inventory.type')}</TableHead>
                  <TableHead>{t('inventory.quantity')}</TableHead>
                  <TableHead>{t('inventory.reference')}</TableHead>
                  <TableHead>{t('inventory.notes')}</TableHead>
                  <TableHead>{t('inventory.user')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="font-medium">
                      {formatDate(movement.movement_date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getMovementIcon(movement.movement_type)}
                        <Badge variant={getMovementVariant(movement.movement_type)}>
                          {movement.movement_type}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <span className={movement.movement_type === 'IN' ? 'text-green-600' : 'text-red-600'}>
                        {movement.movement_type === 'IN' ? '+' : '-'}{movement.quantity}
                      </span>
                    </TableCell>
                    <TableCell>
                      {movement.reference_number || '-'}
                    </TableCell>
                    <TableCell>
                      {movement.notes || '-'}
                    </TableCell>
                    <TableCell>
                      {movement.user?.name || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 