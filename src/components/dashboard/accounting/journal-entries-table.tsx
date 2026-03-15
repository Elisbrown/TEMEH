"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Eye, Trash2 } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import { useSettings } from '@/context/settings-context'

type JournalEntry = {
  id: number
  entry_date: string
  entry_type: string
  description: string
  reference: string
  total_amount: number
  status: string
}

type JournalEntriesTableProps = {
  type?: string
  onRefresh?: () => void
}

export function JournalEntriesTable({ type, onRefresh }: JournalEntriesTableProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingEntry, setDeletingEntry] = useState<JournalEntry | null>(null)
  const [viewingEntry, setViewingEntry] = useState<any | null>(null)
  const { toast } = useToast()
  const { settings } = useSettings()

  useEffect(() => {
    fetchEntries()
  }, [type])

  const fetchEntries = async () => {
    try {
      setLoading(true)
      const url = type 
        ? `/api/accounting/journal-entries?type=${type}`
        : '/api/accounting/journal-entries'
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setEntries(data)
      }
    } catch (error) {
      console.error('Failed to fetch entries:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load journal entries"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleView = async (id: number) => {
    try {
      const response = await fetch(`/api/accounting/journal-entries/${id}`)
      if (response.ok) {
        const data = await response.json()
        setViewingEntry(data)
      }
    } catch (error) {
      console.error('Failed to fetch entry details:', error)
    }
  }

  const handleDelete = async () => {
    if (!deletingEntry) return

    try {
      const response = await fetch(`/api/accounting/journal-entries/${deletingEntry.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Journal entry deleted successfully"
        })
        fetchEntries()
        onRefresh?.()
        setDeletingEntry(null)
      }
    } catch (error) {
      console.error('Failed to delete entry:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete journal entry"
      })
    }
  }

  if (loading) {
    return <div className="text-center p-8 text-muted-foreground">Loading entries...</div>
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <p>No journal entries found.</p>
          <p className="text-sm mt-2">Create your first entry to get started.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{new Date(entry.entry_date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {entry.entry_type}
                  </Badge>
                </TableCell>
                <TableCell>{entry.reference || '—'}</TableCell>
                <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(entry.total_amount, settings.defaultCurrency)}
                </TableCell>
                <TableCell>
                  <Badge variant={entry.status === 'draft' ? 'secondary' : 'default'}>
                    {entry.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={() => handleView(entry.id)}
                      size="sm"
                      variant="ghost"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => setDeletingEntry(entry)}
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* View Entry Dialog */}
      {viewingEntry && (
        <AlertDialog open={!!viewingEntry} onOpenChange={() => setViewingEntry(null)}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Journal Entry #{viewingEntry.id}</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4 text-left">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Date:</strong> {new Date(viewingEntry.entry_date).toLocaleDateString()}</div>
                    <div><strong>Type:</strong> {viewingEntry.entry_type}</div>
                    <div><strong>Reference:</strong> {viewingEntry.reference || '—'}</div>
                    <div><strong>Status:</strong> {viewingEntry.status}</div>
                    <div className="col-span-2"><strong>Description:</strong> {viewingEntry.description}</div>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingEntry.lines?.map((line: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {line.account_code} - {line.account_name}
                            </TableCell>
                            <TableCell>{line.description}</TableCell>
                            <TableCell className="text-right">
                              {line.debit > 0 ? formatCurrency(line.debit, settings.defaultCurrency) : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              {line.credit > 0 ? formatCurrency(line.credit, settings.defaultCurrency) : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-semibold bg-muted">
                          <TableCell colSpan={2}>Total:</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(
                              viewingEntry.lines?.reduce((sum: number, l: any) => sum + l.debit, 0) || 0,
                              settings.defaultCurrency
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(
                              viewingEntry.lines?.reduce((sum: number, l: any) => sum + l.credit, 0) || 0,
                              settings.defaultCurrency
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingEntry} onOpenChange={() => setDeletingEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Journal Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete entry #{deletingEntry?.id}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
