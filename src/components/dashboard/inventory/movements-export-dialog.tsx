"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslation } from "@/hooks/use-translation"
import { useSettings } from "@/context/settings-context"
import { Download, FileText, Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { toast } from "@/hooks/use-toast"

export function MovementsExportDialog() {
  const { t } = useTranslation()
  const { settings } = useSettings()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  })

  const handleExport = async (formatType: 'csv' | 'pdf') => {
    setLoading(true)
    try {
      const response = await fetch(`/api/inventory/movements/export?start=${dateRange.start}&end=${dateRange.end}&format=${formatType}`)
      
      if (!response.ok) throw new Error('Export failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inventory_movements_${dateRange.start}_to_${dateRange.end}.${formatType}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: "Export Success",
        description: `Your ${formatType.toUpperCase()} report has been generated.`
      })
      setOpen(false)
    } catch (error) {
       toast({
        title: "Export Failed",
        description: "Something went wrong while generating the report.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start h-auto py-4">
          <div className="flex items-start gap-3 text-left">
            <ClipboardList className="h-5 w-5 mt-0.5" />
            <div>
              <div className="font-semibold">Export Movements</div>
              <div className="text-sm text-muted-foreground">
                Export stock movements over a custom date range
              </div>
            </div>
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Stock Movements</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input 
                id="start-date" 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input 
                id="end-date" 
                type="date" 
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            className="flex-1 gap-2" 
            onClick={() => handleExport('csv')}
            disabled={loading}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button 
            className="flex-1 gap-2" 
            onClick={() => handleExport('pdf')}
            disabled={loading}
          >
            <FileText className="h-4 w-4" />
            Export PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { ClipboardList } from "lucide-react" // Re-importing because of scope in write_to_file
