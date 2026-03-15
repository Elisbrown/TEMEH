"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/context/auth-context'

export function SyncDataButton() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ unsyncedOrders: number, unsyncedInventory: number, totalUnsynced: number } | null>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/accounting/sync')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error)
    }
  }

  const handleSync = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/accounting/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userEmail: user?.email,
          startDate: '2024-01-01', // Sync everything for now
          endDate: new Date().toISOString().split('T')[0]
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Sync Successful",
          description: result.message
        })
        fetchStatus()
        // Force refresh of any reports on the page
        window.dispatchEvent(new CustomEvent('accounting-data-synced'))
      } else {
        throw new Error('Sync failed')
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: "Could not sync transactions to accounting."
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      {status && status.totalUnsynced > 0 && (
        <div className="flex items-center text-sm text-amber-600 gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
          <AlertCircle className="h-4 w-4" />
          <span>{status.totalUnsynced} unsynced transactions</span>
        </div>
      )}
      
      {status && status.totalUnsynced === 0 && (
        <div className="flex items-center text-sm text-green-600 gap-1.5 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
          <CheckCircle2 className="h-4 w-4" />
          <span>All transactions synced</span>
        </div>
      )}

      <Button 
        onClick={handleSync} 
        disabled={loading} 
        variant="outline" 
        className="gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Sync Accounting Data
      </Button>
    </div>
  )
}
