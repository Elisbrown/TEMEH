
"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/auth-context'

type JournalLine = {
  account_code: string
  account_name: string
  description: string
  debit: number
  credit: number
}

type JournalEntryFormProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess: () => void
  defaultType?: string
}

export function JournalEntryForm({ open, onOpenChange, onSuccess, defaultType = 'general' }: JournalEntryFormProps) {
  const [accounts, setAccounts] = useState<any[]>([])
  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    entry_type: defaultType,
    description: '',
    reference: '',
  })
  const [lines, setLines] = useState<JournalLine[]>([
    { account_code: '', account_name: '', description: '', debit: 0, credit: 0 },
    { account_code: '', account_name: '', description: '', debit: 0, credit: 0 },
  ])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounting/chart-of-accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data)
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    }
  }

  const handleAccountChange = (index: number, code: string) => {
    const account = accounts.find(a => a.code === code)
    if (account) {
      const newLines = [...lines]
      newLines[index].account_code = account.code
      newLines[index].account_name = account.name
      setLines(newLines)
    }
  }

  const handleLineChange = (index: number, field: string, value: any) => {
    const newLines = [...lines]
    newLines[index] = { ...newLines[index], [field]: value }
    setLines(newLines)
  }

  const addLine = () => {
    setLines([...lines, { account_code: '', account_name: '', description: '', debit: 0, credit: 0 }])
  }

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index))
    }
  }

  const calculateTotals = () => {
    const totalDebits = lines.reduce((sum, line) => sum + (parseFloat(line.debit.toString()) || 0), 0)
    const totalCredits = lines.reduce((sum, line) => sum + (parseFloat(line.credit.toString()) || 0), 0)
    return { totalDebits, totalCredits, balanced: Math.abs(totalDebits - totalCredits) < 0.01 }
  }

  const handleSubmit = async () => {
    const { totalDebits, totalCredits, balanced } = calculateTotals()

    if (!balanced) {
      toast({
        variant: "destructive",
        title: "Entry Not Balanced",
        description: `Debits (${totalDebits.toFixed(2)}) must equal Credits (${totalCredits.toFixed(2)})`
      })
      return
    }

    if (lines.some(l => !l.account_code)) {
      toast({
        variant: "destructive",
        title: "Missing Accounts",
        description: "Please select an account for all lines"
      })
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/accounting/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userEmail: user?.email,
          lines: lines.map(l => ({
            account_code: l.account_code,
            account_name: l.account_name,
            description: l.description,
            debit: parseFloat(l.debit.toString()) || 0,
            credit: parseFloat(l.credit.toString()) || 0,
          }))
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Journal entry created successfully"
        })
        onSuccess()
        if (onOpenChange) {
          onOpenChange(false)
        }
        // Reset form
        setFormData({
          entry_date: new Date().toISOString().split('T')[0],
          entry_type: 'general',
          description: '',
          reference: '',
        })
        setLines([
          { account_code: '', account_name: '', description: '', debit: 0, credit: 0 },
          { account_code: '', account_name: '', description: '', debit: 0, credit: 0 },
        ])
      } else {
        const error = await response.json()
        toast({
          variant: "destructive",
          title: "Error",
          description: error.error || "Failed to create journal entry"
        })
      }
    } catch (error) {
      console.error('Failed to create journal entry:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create journal entry"
      })
    } finally {
      setLoading(false)
    }
  }

  const totals = calculateTotals()

  const content = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="entry_date">Date</Label>
          <Input
            id="entry_date"
            type="date"
            value={formData.entry_date}
            onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="entry_type">Type</Label>
          <Select value={formData.entry_type} onValueChange={(value) => setFormData({ ...formData, entry_type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of this entry"
        />
      </div>
      <div>
        <Label htmlFor="reference">Reference #</Label>
        <Input
          id="reference"
          value={formData.reference}
          onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
          placeholder="Invoice #, receipt #, etc."
        />
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Journal Lines</h3>
          <Button onClick={addLine} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" /> Add Line
          </Button>
        </div>

        <div className="space-y-2">
          {lines.map((line, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-end pb-2 border-b">
              <div className="col-span-3">
                {index === 0 && <Label className="text-xs">Account</Label>}
                <Select value={line.account_code} onValueChange={(value) => handleAccountChange(index, value)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(account => (
                      <SelectItem key={account.code} value={account.code}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                {index === 0 && <Label className="text-xs">Description</Label>}
                <Input
                  className="text-sm"
                  value={line.description}
                  onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                  placeholder="Line description"
                />
              </div>
              <div className="col-span-2">
                {index === 0 && <Label className="text-xs">Debit</Label>}
                <Input
                  className="text-sm"
                  type="number"
                  step="0.01"
                  value={line.debit || ''}
                  onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-2">
                {index === 0 && <Label className="text-xs">Credit</Label>}
                <Input
                  className="text-sm"
                  type="number"
                  step="0.01"
                  value={line.credit || ''}
                  onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-2 flex justify-end">
                {lines.length > 2 && (
                  <Button
                    onClick={() => removeLine(index)}
                    size="sm"
                    variant="ghost"
                    className="h-9"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-2 border-t-2 font-semibold">
          <span>Totals:</span>
          <div className="flex gap-4">
            <span className="w-24 text-right">
              {totals.totalDebits.toFixed(2)}
            </span>
            <span className="w-24 text-right">
              {totals.totalCredits.toFixed(2)}
            </span>
            <span className="w-16"></span>
          </div>
        </div>
        {!totals.balanced && (
          <p className="text-sm text-destructive">
            ⚠️ Entry is not balanced! Difference: {Math.abs(totals.totalDebits - totals.totalCredits).toFixed(2)}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        {onOpenChange && (
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={loading || !totals.balanced}>
          {loading ? 'Creating...' : 'Create Entry'}
        </Button>
      </div>
    </div>
  )

  if (!open && !onOpenChange) {
    return content
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Journal Entry</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}
