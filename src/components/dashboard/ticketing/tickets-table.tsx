"use client"

import { useState, useMemo } from 'react'
import { MoreHorizontal, Eye, Edit, Trash2, User, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTickets } from '@/context/ticket-context'
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from '@/hooks/use-translation'
import type { Ticket } from '@/lib/db/tickets'
import { EditTicketDialog } from './edit-ticket-dialog'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'

interface TicketsTableProps {
  onSelectTicket: (ticket: Ticket) => void
}

export function TicketsTable({ onSelectTicket }: TicketsTableProps) {
  const { tickets, deleteTicket, loading } = useTickets()
  const { toast } = useToast()
  const { t } = useTranslation()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null)
  const [deletingTicket, setDeletingTicket] = useState<Ticket | null>(null)

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const matchesSearch = searchTerm === '' || 
        ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'All' || ticket.status === statusFilter
      const matchesPriority = priorityFilter === 'All' || ticket.priority === priorityFilter
      
      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [tickets, searchTerm, statusFilter, priorityFilter])

  const getStatusVariant = (status: Ticket['status']) => {
    switch (status) {
      case 'Open': return 'default'
      case 'In Progress': return 'secondary'
      case 'Resolved': return 'outline'
      case 'Closed': return 'destructive'
    }
  }

  const getPriorityVariant = (priority: Ticket['priority']) => {
    switch (priority) {
      case 'Low': return 'outline'
      case 'Medium': return 'secondary'
      case 'High': return 'default'
      case 'Critical': return 'destructive'
      case 'Urgent': return 'destructive'
      default: return 'secondary'
    }
  }

  const handleDelete = async () => {
    if (!deletingTicket) return
    
    try {
      await deleteTicket(deletingTicket.id)
      toast({
        title: t('toasts.ticketDeleted'),
        description: t('toasts.ticketDeletedDesc', { title: deletingTicket.title })
      })
      setDeletingTicket(null)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('toasts.error'),
        description: t('toasts.deleteFailed')
      })
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-2">
          <Input
            placeholder={t('support.searchTickets')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Resolved">Resolved</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Priorities</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm('')
              setStatusFilter('All')
              setPriorityFilter('All')
            }}
            disabled={searchTerm === '' && statusFilter === 'All' && priorityFilter === 'All'}
          >
            Clear Filters
          </Button>
        </div>

        {/* Table */}
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading tickets...
                  </TableCell>
                </TableRow>
              ) : filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No tickets found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium" onClick={() => onSelectTicket(ticket)}>
                      <div>
                        <div>{ticket.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {ticket.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => onSelectTicket(ticket)}>
                      <Badge variant={getStatusVariant(ticket.status)}>
                        {ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={() => onSelectTicket(ticket)}>
                      <Badge variant={getPriorityVariant(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={() => onSelectTicket(ticket)}>
                      {ticket.category}
                    </TableCell>
                    <TableCell onClick={() => onSelectTicket(ticket)}>
                      {ticket.assignee ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="text-sm">{ticket.assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell onClick={() => onSelectTicket(ticket)}>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onSelectTicket(ticket)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingTicket(ticket)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletingTicket(ticket)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Dialog */}
      {editingTicket && (
        <EditTicketDialog
          ticket={editingTicket}
          open={!!editingTicket}
          onOpenChange={(open) => !open && setEditingTicket(null)}
        />
      )}

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        open={!!deletingTicket}
        onOpenChange={(open) => !open && setDeletingTicket(null)}
        onConfirm={handleDelete}
        title="Delete Ticket"
        description={`Are you sure you want to delete "${deletingTicket?.title}"? This action cannot be undone.`}
      />
    </>
  )
}
