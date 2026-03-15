// src/lib/db/tickets.ts
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db');

export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical' | 'Urgent';
export type TicketCategory = 'IT Support' | 'Maintenance' | 'Inventory Request' | 'HR Issue';

export interface Ticket {
    id: number;
    title: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    category: TicketCategory | string;
    created_by: number;
    assigned_to?: number;
    created_at: string;
    updated_at: string;
    resolved_at?: string;
    creator?: {
        id: number;
        name: string;
        email: string;
    };
    assignee?: {
        id: number;
        name: string;
        email: string;
    };
    comments?: TicketComment[];
}

export interface TicketComment {
    id: number;
    ticket_id: number;
    author_id: number;
    content: string;
    created_at: string;
    author?: {
        id: number;
        name: string;
        email: string;
    };
}

interface TicketFilters {
    status?: string;
    priority?: string;
    category?: string;
    assigned_to?: number;
    created_by?: number;
}

// Initialize tickets table
function initializeTicketsTable() {
    const db = new Database(dbPath);
    
    db.exec(`
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Open',
            priority TEXT NOT NULL DEFAULT 'Medium',
            category TEXT NOT NULL,
            creator_id INTEGER NOT NULL,
            assignee_id INTEGER,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            resolved_at TEXT,
            FOREIGN KEY (creator_id) REFERENCES users(id),
            FOREIGN KEY (assignee_id) REFERENCES users(id)
        )
    `);
    
    // Create ticket_comments table
    db.exec(`
        CREATE TABLE IF NOT EXISTS ticket_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id INTEGER NOT NULL,
            author_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
            FOREIGN KEY (author_id) REFERENCES users(id)
        )
    `);
    
    db.close();
}

// Get all tickets with filters
export function getTickets(filters?: TicketFilters): Ticket[] {
    const db = new Database(dbPath);
    
    let query = `
        SELECT 
            t.*,
            c.id as creator_id, c.name as creator_name, c.email as creator_email,
            a.id as assignee_id, a.name as assignee_name, a.email as assignee_email
        FROM tickets t
        LEFT JOIN users c ON t.creator_id = c.id
        LEFT JOIN users a ON t.assignee_id = a.id
        WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (filters?.status) {
        query += ' AND t.status = ?';
        params.push(filters.status);
    }
    if (filters?.priority) {
        query += ' AND t.priority = ?';
        params.push(filters.priority);
    }
    if (filters?.category) {
        query += ' AND t.category = ?';
        params.push(filters.category);
    }
    if (filters?.assigned_to) {
        query += ' AND t.assignee_id = ?';
        params.push(filters.assigned_to);
    }
    if (filters?.created_by) {
        query += ' AND t.creator_id = ?';
        params.push(filters.created_by);
    }
    
    query += ' ORDER BY t.updated_at DESC';
    
    const stmt = db.prepare(query);
    const rows = stmt.all(...params) as any[];
    
    const tickets = rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        category: row.category,
        created_by: row.created_by,
        assigned_to: row.assigned_to,
        created_at: row.created_at,
        updated_at: row.updated_at,
        resolved_at: row.resolved_at,
        creator: row.creator_id ? {
            id: row.creator_id,
            name: row.creator_name,
            email: row.creator_email
        } : undefined,
        assignee: row.assignee_id ? {
            id: row.assignee_id,
            name: row.assignee_name,
            email: row.assignee_email
        } : undefined,
        comments: getTicketComments(row.id)
    }));
    
    db.close();
    return tickets;
}

// Get single ticket by ID
export function getTicketById(id: number): Ticket | null {
    const db = new Database(dbPath);
    
    const stmt = db.prepare(`
        SELECT 
            t.*,
            c.id as creator_id, c.name as creator_name, c.email as creator_email,
            a.id as assignee_id, a.name as assignee_name, a.email as assignee_email
        FROM tickets t
        LEFT JOIN users c ON t.creator_id = c.id
        LEFT JOIN users a ON t.assignee_id = a.id
        WHERE t.id = ?
    `);
    
    const row = stmt.get(id) as any;
    db.close();
    
    if (!row) return null;
    
    const ticket = {
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        category: row.category,
        created_by: row.created_by,
        assigned_to: row.assigned_to,
        created_at: row.created_at,
        updated_at: row.updated_at,
        resolved_at: row.resolved_at,
        creator: row.creator_id ? {
            id: row.creator_id,
            name: row.creator_name,
            email: row.creator_email
        } : undefined,
        assignee: row.assignee_id ? {
            id: row.assignee_id,
            name: row.assignee_name,
            email: row.assignee_email
        } : undefined,
        comments: getTicketComments(id)
    };
    
    return ticket;
}

// Get comments for a ticket
export function getTicketComments(ticketId: number): TicketComment[] {
    const db = new Database(dbPath);
    
    const stmt = db.prepare(`
        SELECT 
            tc.*,
            u.name as author_name, u.email as author_email
        FROM ticket_comments tc
        LEFT JOIN users u ON tc.author_id = u.id
        WHERE tc.ticket_id = ?
        ORDER BY tc.created_at ASC
    `);
    
    const rows = stmt.all(ticketId) as any[];
    db.close();
    
    return rows.map(row => ({
        id: row.id,
        ticket_id: row.ticket_id,
        author_id: row.author_id,
        content: row.content,
        created_at: row.created_at,
        author: row.author_id ? {
            id: row.author_id,
            name: row.author_name,
            email: row.author_email
        } : undefined
    }));
}

// Add a comment to a ticket
export function addComment(ticketId: number | string, data: { author_id: number; content: string }): Ticket {
    const db = new Database(dbPath);
    const id = typeof ticketId === 'string' ? parseInt(ticketId) : ticketId;
    
    const stmt = db.prepare(`
        INSERT INTO ticket_comments (ticket_id, author_id, content)
        VALUES (?, ?, ?)
    `);
    
    stmt.run(id, data.author_id, data.content);
    
    // Update ticket's updated_at
    db.prepare('UPDATE tickets SET updated_at = datetime(\'now\') WHERE id = ?').run(id);
    
    db.close();
    
    const ticket = getTicketById(id);
    if (!ticket) throw new Error('Ticket not found after adding comment');
    
    return ticket;
}

// Create new ticket
export function createTicket(data: {
    title: string;
    description: string;
    priority: string;
    category: string;
    created_by: number;
}): Ticket {
    const db = new Database(dbPath);
    
    const stmt = db.prepare(`
        INSERT INTO tickets (title, description, priority, category, creator_id)
        VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
        data.title,
        data.description,
        data.priority,
        data.category,
        data.created_by
    );
    
    db.close();
    
    const newTicket = getTicketById(Number(result.lastInsertRowid));
    if (!newTicket) throw new Error('Failed to create ticket');
    
    return newTicket;
}

// Update ticket
export function updateTicket(id: number, data: Partial<Ticket>): Ticket {
    const db = new Database(dbPath);
    
    const updates: string[] = [];
    const params: any[] = [];
    
    if (data.title !== undefined) {
        updates.push('title = ?');
        params.push(data.title);
    }
    if (data.description !== undefined) {
        updates.push('description = ?');
        params.push(data.description);
    }
    if (data.status !== undefined) {
        updates.push('status = ?');
        params.push(data.status);
        
        // Set resolved_at when status is changed to Resolved or Closed
        if (data.status === 'Resolved' || data.status === 'Closed') {
            updates.push('resolved_at = datetime(\'now\')');
        }
    }
    if (data.priority !== undefined) {
        updates.push('priority = ?');
        params.push(data.priority);
    }
    if (data.category !== undefined) {
        updates.push('category = ?');
        params.push(data.category);
    }
    if (data.assigned_to !== undefined) {
        updates.push('assignee_id = ?');
        params.push(data.assigned_to);
    }
    
    updates.push('updated_at = datetime(\'now\')');
    params.push(id);
    
    const stmt = db.prepare(`
        UPDATE tickets 
        SET ${updates.join(', ')}
        WHERE id = ?
    `);
    
    stmt.run(...params);
    db.close();
    
    const updatedTicket = getTicketById(id);
    if (!updatedTicket) throw new Error('Failed to update ticket');
    
    return updatedTicket;
}

// Assign ticket to user
export function assignTicket(ticketId: number, userId: number | null): Ticket {
    return updateTicket(ticketId, { assigned_to: userId ?? undefined });
}

// Update ticket status
export function updateTicketStatus(ticketId: number, status: Ticket['status']): Ticket {
    return updateTicket(ticketId, { status });
}

// Delete ticket
export function deleteTicket(id: number): boolean {
    const db = new Database(dbPath);
    
    const stmt = db.prepare('DELETE FROM tickets WHERE id = ?');
    const result = stmt.run(id);
    
    db.close();
    
    return result.changes > 0;
}

// Initialize table on module load
initializeTicketsTable();
