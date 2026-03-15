// New component for displaying activity logs in a table
"use client"

import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { useTranslation } from "@/hooks/use-translation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trash2, Download, Search, Info } from "lucide-react"
import type { ActivityLog } from '@/context/activity-log-context'
import { useActivityLog } from '@/hooks/use-activity-log'
import { useToast } from '@/hooks/use-toast'
import { Pagination } from "@/components/ui/pagination"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

type ActivityLogTableProps = {
  logs: ActivityLog[]
}

export function ActivityLogTable({ logs }: ActivityLogTableProps) {
  const { t } = useTranslation()
  const { clearLogs } = useActivityLog()
  const { toast } = useToast()
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)

  const handleClearLogs = () => {
    clearLogs()
    toast({
      title: t('activity.logsCleared'),
      description: t('activity.logsClearedDesc'),
    })
  }

  const handleExportCSV = () => {
    const headers = ["User", "Email", "Action", "Target", "Details", "Metadata", "Timestamp"];
    const rows = logs.map(log => [
      log.user?.name || 'Unknown',
      log.user?.email || 'Unknown',
      log.action,
      log.target || '',
      log.details || '',
      log.metadata ? JSON.stringify(log.metadata) : '',
      format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")
    ]);

    let csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `activity_logs_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Filter logs based on search term
  const filteredLogs = useMemo(() => {
    if (!searchTerm) return logs;

    const search = searchTerm.toLowerCase();
    return logs.filter(log =>
      (log.user?.name?.toLowerCase().includes(search)) ||
      (log.user?.email?.toLowerCase().includes(search)) ||
      (log.action?.toLowerCase().includes(search)) ||
      (log.target?.toLowerCase().includes(search)) ||
      (log.details?.toLowerCase().includes(search)) ||
      (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(search))
    );
  }, [logs, searchTerm]);

  // Paginate filtered logs
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredLogs.slice(startIndex, endIndex);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  // Reset to page 1 when search term changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <Select value={itemsPerPage.toString()} onValueChange={(value) => {
            setItemsPerPage(parseInt(value));
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            {t('reports.export')} CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearLogs}>
            <Trash2 className="mr-2 h-4 w-4" />
            {t('activity.clearLogs')}
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('activity.user')}</TableHead>
              <TableHead>{t('activity.action')}</TableHead>
              <TableHead>{t('activity.target')}</TableHead>
              <TableHead>{t('activity.details')}</TableHead>
              <TableHead>{t('activity.timestamp')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLogs.length > 0 ? (
              paginatedLogs.map((log) => {
                const userName = log.user?.name || 'Unknown User';
                const userEmail = log.user?.email || 'No email';
                const userAvatar = log.user?.avatar || "https://placehold.co/100x100.png";

                return (
                  <TableRow
                    key={log.id}
                    className="group cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedLog(log)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={userAvatar} alt={userName} data-ai-hint="person" />
                          <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{userName}</p>
                          <p className="text-[10px] text-muted-foreground">{userEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{log.target || '-'}</TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="text-sm truncate" title={log.details || ''}>{log.details || ''}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.timestamp), "MMM dd, HH:mm:ss")}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {searchTerm ? 'No logs match your search' : t('activity.noLogs')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={filteredLogs.length}
        />
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Activity Log Details</DialogTitle>
            <DialogDescription>
              {selectedLog && format(new Date(selectedLog.timestamp), "PPpp")}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-1">User</h4>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={selectedLog.user?.avatar} />
                        <AvatarFallback>{selectedLog.user?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{selectedLog.user?.name}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Action</h4>
                    <Badge>{selectedLog.action}</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">Target</h4>
                  <p className="text-sm font-mono bg-muted p-2 rounded-md">{selectedLog.target || 'N/A'}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-1">Details</h4>
                  <p className="text-sm border p-3 rounded-md">{selectedLog.details}</p>
                </div>

                {selectedLog.metadata && (
                  <div>
                    <h4 className="font-semibold mb-1">Metadata</h4>
                    <div className="bg-slate-950 text-slate-50 p-3 rounded-md font-mono text-xs overflow-x-auto">
                      <pre>{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button onClick={() => setSelectedLog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
