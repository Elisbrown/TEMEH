
"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/auth-context'

type SimpleExpenseFormProps = {
  onSuccess: () => void
}

export function SimpleExpenseForm({ onSuccess }: SimpleExpenseFormProps) {
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    payee: '',
    amount: '',
    category: '', // Expense account
    paymentMethod: '', // Asset account
    notes: ''
  })
  
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

  const expenseAccounts = accounts.filter(a => a.account_type === 'expense')
  const assetAccounts = accounts.filter(a => a.account_type === 'asset')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.category || !formData.paymentMethod || !formData.amount || !formData.payee) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required fields."
      })
      return
    }

    try {
      setLoading(true)
      
      const amount = parseFloat(formData.amount)
      const expenseAccount = accounts.find(a => a.code === formData.category)
      const assetAccount = accounts.find(a => a.code === formData.paymentMethod)

      const response = await fetch('/api/accounting/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_date: formData.date,
          entry_type: 'expense',
          description: `Expense: ${formData.payee}${formData.notes ? ` - ${formData.notes}` : ''}`,
          reference: formData.payee,
          userEmail: user?.email,
          lines: [
            {
              account_code: formData.category,
              account_name: expenseAccount?.name || 'Expense',
              description: formData.payee,
              debit: amount,
              credit: 0
            },
            {
              account_code: formData.paymentMethod,
              account_name: assetAccount?.name || 'Asset',
              description: 'Payment',
              debit: 0,
              credit: amount
            }
          ]
        })
      })

      if (response.ok) {
        toast({
          title: "Expense Recorded",
          description: "Your expense has been successfully recorded."
        })
        setFormData({
          date: new Date().toISOString().split('T')[0],
          payee: '',
          amount: '',
          category: '',
          paymentMethod: '',
          notes: ''
        })
        onSuccess()
      } else {
        throw new Error('Failed to create entry')
      }
    } catch (error) {
      console.error('Error recording expense:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to record expense. Please try again."
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              className="pl-7"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="payee">Payee / Vendor</Label>
          <Input
            id="payee"
            placeholder="e.g. Office Depot, Landlord"
            value={formData.payee}
            onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select 
            value={formData.category} 
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {expenseAccounts.map(account => (
                <SelectItem key={account.code} value={account.code}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Paid From</Label>
          <Select 
            value={formData.paymentMethod} 
            onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              {assetAccounts.map(account => (
                <SelectItem key={account.code} value={account.code}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          placeholder="Additional details..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>

      <Button type="submit" className="w-full md:w-auto" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Record Expense
      </Button>
    </form>
  )
}
