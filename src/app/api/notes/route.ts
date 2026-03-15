
import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import { addActivityLog } from '@/lib/db/activity-logs';
import { getStaffByEmail } from '@/lib/db/staff';

function getDb(): Database.Database {
  const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db')
  return new Database(dbPath)
}

async function getActorId(email?: string) {
  if (!email || email === "system") return null;
  const user = await getStaffByEmail(email);
  return user ? Number(user.id) : null;
}

export async function GET() {
  const db = getDb()

  try {
    // Create notes table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        user_id INTEGER,
        is_pinned BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    const stmt = db.prepare(`
      SELECT 
        id,
        title,
        content,
        tags,
        user_id,
        is_pinned,
        created_at,
        updated_at
      FROM notes 
      ORDER BY is_pinned DESC, updated_at DESC
    `)

    const notes = stmt.all().map((note: any) => ({
      ...note,
      tags: note.tags ? JSON.parse(note.tags) : [],
      id: note.id.toString(),
      is_pinned: Boolean(note.is_pinned)
    }))

    return NextResponse.json(notes)
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    )
  } finally {
    db.close()
  }
}

export async function POST(request: NextRequest) {
  const db = getDb()

  try {
    const body = await request.json()
    const { title, content, tags, userEmail } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const actorId = await getActorId(userEmail);

    // Create notes table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        user_id INTEGER,
        is_pinned BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    const stmt = db.prepare(`
      INSERT INTO notes (title, content, tags, user_id)
      VALUES (?, ?, ?, ?)
    `)

    const result = stmt.run(title, content, JSON.stringify(tags || []), actorId || 1)

    const newNote = {
      id: result.lastInsertRowid.toString(),
      title,
      content,
      tags: tags || [],
      user_id: actorId || 1,
      is_pinned: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    await addActivityLog(
      actorId,
      'NOTE_CREATE',
      `Created note: ${title}`,
      title,
      { tags: tags || [] }
    );

    return NextResponse.json(newNote)
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    )
  } finally {
    db.close()
  }
} 