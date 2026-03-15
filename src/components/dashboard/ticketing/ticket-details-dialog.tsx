"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Calendar, User, Tag, AlertCircle, CheckCircle, Edit } from 'lucide-react'
import type { Ticket } from '@/lib/db/tickets'
import { useState } from 'react'
import { EditTicketDialog } from './edit-ticket-dialog'
import { useTickets } from '@/context/ticket-context'
import { useAuth } from '@/context/auth-context'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

interface TicketDetailsDialogProps {
  ticket: Ticket
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TicketDetailsDialog({ ticket: initialTicket, open, onOpenChange }: TicketDetailsDialogProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const { addComment, tickets } = useTickets()
  const { user } = useAuth()
  const { toast } = useToast()

  const ticket = tickets.find(t => t.id === initialTicket.id) || initialTicket;

  const getStatusVariant = (status: Ticket['status']) => {
    switch (status) {
      case 'Open': return 'default'
      case 'In Progress': return 'secondary'
      case 'Resolved': return 'outline'
      case 'Closed': return 'destructive'
      default: return 'default'
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

  const handleAddComment = async () => {
    if (!comment.trim() || !user) return
    
    setSubmittingComment(true)
    try {
      await addComment(ticket.id, {
        author_id: Number(user.id),
        content: comment.trim()
      })
      setComment('')
      toast({
        title: "Comment added",
        description: "Your comment has been successfully added to the ticket."
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add comment. Please try again."
      })
    } finally {
      setSubmittingComment(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (e) {
      return dateString
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-start justify-between mt-2">
              <div className="space-y-1 flex-1">
                <DialogTitle className="text-2xl">{ticket.title}</DialogTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={getStatusVariant(ticket.status)}>
                    {ticket.status}
                  </Badge>
                  <Badge variant={getPriorityVariant(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                  <Badge variant="outline">
                    <Tag className="h-3 w-3 mr-1" />
                    {ticket.category}
                  </Badge>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-6 py-4">
              {/* Description */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Description</h3>
                <div className="p-4 rounded-lg bg-muted/30 border border-muted text-sm whitespace-pre-wrap leading-relaxed">
                  {ticket.description}
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Created By</p>
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {ticket.creator?.name?.substring(0, 2).toUpperCase() || '??'}
                    </div>
                    <span className="text-sm font-medium">
                      {ticket.creator?.name || 'Unknown'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Assigned To</p>
                  <div className="flex items-center gap-2">
                    {ticket.assignee ? (
                      <>
                        <div className="h-7 w-7 rounded-full bg-secondary/20 flex items-center justify-center text-xs font-bold text-secondary-foreground">
                          {ticket.assignee.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{ticket.assignee.name}</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Unassigned</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Created Date</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(ticket.created_at)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Last Activity</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(ticket.updated_at)}</span>
                  </div>
                </div>
              </div>

              {ticket.resolved_at && (
                <div className="p-3 border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 rounded-md flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-green-800 dark:text-green-300">
                    Resolved on {formatDate(ticket.resolved_at)}
                  </span>
                </div>
              )}

              <Separator />

              {/* Comments Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Comments</h3>
                
                <div className="space-y-4">
                  {ticket.comments && ticket.comments.length > 0 ? (
                    ticket.comments.map((c) => (
                      <div key={c.id} className="flex gap-3 text-sm">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {c.author?.name?.substring(0, 2).toUpperCase() || '??'}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{c.author?.name || 'Unknown'}</span>
                            <span className="text-[10px] text-muted-foreground">{formatDate(c.created_at)}</span>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/20 border border-muted text-sm text-foreground/90">
                            {c.content}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic text-center py-4 bg-muted/10 rounded-lg">
                      No comments yet. Be the first to add one.
                    </p>
                  )}
                </div>

                {/* New Comment Form */}
                <div className="space-y-3 pt-2">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                      {user?.name?.substring(0, 2).toUpperCase() || '??'}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Textarea 
                        placeholder="Type your message..." 
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="min-h-[80px] resize-none focus:ring-1"
                      />
                      <div className="flex justify-end">
                        <Button 
                          size="sm" 
                          onClick={handleAddComment} 
                          disabled={submittingComment || !comment.trim()}
                        >
                          {submittingComment ? 'Sending...' : 'Send Message'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editDialogOpen && (
        <EditTicketDialog
          ticket={ticket}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open)
            if (!open) {
              // The parent refresh will happen via context update
            }
          }}
        />
      )}
    </>
  )
}
