
"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useTranslation } from "@/hooks/use-translation"

interface CancelOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string) => void
  orderId: string
}

const CANCELLATION_REASONS = [
  "Out of stock",
  "Customer changed mind",
  "Mistake entry",
  "Long wait time",
  "Other"
]

export function CancelOrderDialog({
  open,
  onOpenChange,
  onConfirm,
  orderId,
}: CancelOrderDialogProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState<string>(CANCELLATION_REASONS[0])
  const [customReason, setCustomReason] = useState("")

  const handleConfirm = () => {
    const finalReason = reason === "Other" ? customReason : reason
    onConfirm(finalReason)
    setCustomReason("")
    setReason(CANCELLATION_REASONS[0])
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('kitchen.cancelOrder')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('kitchen.cancelOrderDesc', { orderId })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="grid gap-4 py-4">
          <Label className="text-base font-semibold">Reason for cancellation</Label>
          <RadioGroup value={reason} onValueChange={setReason} className="grid gap-2">
            {CANCELLATION_REASONS.map((r) => (
              <div key={r} className="flex items-center space-x-2">
                <RadioGroupItem value={r} id={r} />
                <Label htmlFor={r}>{r}</Label>
              </div>
            ))}
          </RadioGroup>
          
          {reason === "Other" && (
            <div className="grid gap-2">
              <Label htmlFor="custom-reason">Specify reason</Label>
              <Input
                id="custom-reason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter reason..."
              />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{t('dialogs.cancel')}</AlertDialogCancel>
          <Button onClick={handleConfirm} disabled={reason === "Other" && !customReason.trim()}>
            {t('kitchen.confirmCancel')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
