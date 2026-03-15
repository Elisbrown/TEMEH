import Database from 'better-sqlite3';
import path from 'path';

interface Event {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  capacity: number;
  created_at: string;
  updated_at: string;
}

interface EventInput {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  capacity: number;
}

function getDb(): Database.Database {
  const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db');
  return new Database(dbPath);
}

export function initEventsTable() {
  const db = getDb();
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        location TEXT,
        capacity INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } finally {
    db.close();
  }
}

export function getAllEvents(): Event[] {
  const db = getDb();
  try {
    initEventsTable();
    const stmt = db.prepare('SELECT * FROM events ORDER BY start_date DESC');
    return stmt.all() as Event[];
  } finally {
    db.close();
  }
}

export function getEventById(id: number): Event | null {
  const db = getDb();
  try {
    const stmt = db.prepare('SELECT * FROM events WHERE id = ?');
    return stmt.get(id) as Event | null;
  } finally {
    db.close();
  }
}

export function createEvent(event: EventInput): Event {
  const db = getDb();
  try {
    initEventsTable();
    const stmt = db.prepare(`
      INSERT INTO events (title, description, start_date, end_date, location, capacity)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      event.title,
      event.description,
      event.start_date,
      event.end_date,
      event.location,
      event.capacity
    );

    return getEventById(Number(result.lastInsertRowid))!;
  } finally {
    db.close();
  }
}

export function updateEvent(id: number, event: Partial<EventInput>): Event | null {
  const db = getDb();
  try {
    const updates: string[] = [];
    const values: any[] = [];

    if (event.title !== undefined) {
      updates.push('title = ?');
      values.push(event.title);
    }
    if (event.description !== undefined) {
      updates.push('description = ?');
      values.push(event.description);
    }
    if (event.start_date !== undefined) {
      updates.push('start_date = ?');
      values.push(event.start_date);
    }
    if (event.end_date !== undefined) {
      updates.push('end_date = ?');
      values.push(event.end_date);
    }
    if (event.location !== undefined) {
      updates.push('location = ?');
      values.push(event.location);
    }
    if (event.capacity !== undefined) {
      updates.push('capacity = ?');
      values.push(event.capacity);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`
      UPDATE events 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
    return getEventById(id);
  } finally {
    db.close();
  }
}

export function deleteEvent(id: number): boolean {
  const db = getDb();
  try {
    const stmt = db.prepare('DELETE FROM events WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  } finally {
    db.close();
  }
}
