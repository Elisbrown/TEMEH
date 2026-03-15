
"use client"

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import type { Ticket } from '@/lib/db/tickets';
import { useAuth } from './auth-context';

type TicketContextType = {
  tickets: Ticket[];
  loading: boolean;
  addTicket: (ticketData: any) => Promise<void>;
  updateTicket: (id: number, ticketData: Partial<Ticket>) => Promise<void>;
  deleteTicket: (id: number) => Promise<void>;
  fetchTickets: () => Promise<void>;
  addComment: (ticketId: number, commentData: any) => Promise<void>;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export const TicketProvider = ({ children }: { children: ReactNode }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  
  const fetchTickets = useCallback(async (isBackground = false) => {
    if (!isBackground && tickets.length === 0) setLoading(true);
    try {
      const response = await fetch('/api/tickets');
      if (response.ok) {
        const data = await response.json();
        setTickets(prev => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data;
        });
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchTickets(); // Initial fetch
    const interval = setInterval(() => fetchTickets(true), 60000); // Poll every 60 seconds
    return () => clearInterval(interval);
  }, [fetchTickets]);

  const addTicket = useCallback(async (ticketData: any) => {
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ticketData, userEmail: user?.email })
      });
      
      if (response.ok) {
        await fetchTickets();
      }
    } catch (error) {
      console.error('Failed to add ticket:', error);
      throw error;
    }
  }, [fetchTickets, user?.email]);

  const updateTicket = useCallback(async (id: number, ticketData: Partial<Ticket>) => {
    try {
      const response = await fetch(`/api/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ticketData, userEmail: user?.email })
      });
      
      if (response.ok) {
        await fetchTickets();
      }
    } catch (error) {
      console.error('Failed to update ticket:', error);
      throw error;
    }
  }, [fetchTickets, user?.email]);
  
  const deleteTicket = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/tickets/${id}?userEmail=${user?.email || ''}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchTickets();
      }
    } catch (error) {
      console.error('Failed to delete ticket:', error);
      throw error;
    }
  }, [fetchTickets, user?.email]);

  const addComment = useCallback(async (ticketId: number, commentData: any) => {
    try {
      const response = await fetch(`/api/tickets/comments?id=${ticketId}&userEmail=${user?.email || ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commentData)
      });
      
      if (response.ok) {
        await fetchTickets();
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw error;
    }
  }, [fetchTickets, user?.email]);

  return (
    <TicketContext.Provider value={{ tickets, loading, addTicket, updateTicket, deleteTicket, fetchTickets, addComment }}>
      {children}
    </TicketContext.Provider>
  );
};

export const useTickets = () => {
  const context = useContext(TicketContext);
  if (context === undefined) {
    throw new Error('useTickets must be used within a TicketProvider');
  }
  return context;
};

// Re-export Ticket type for convenience
export type { Ticket, TicketPriority, TicketCategory, TicketStatus } from '@/lib/db/tickets';
