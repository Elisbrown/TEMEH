
import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import { addActivityLog } from '@/lib/db/activity-logs';
import { getStaffByEmail } from '@/lib/db/staff';

function getDb(): Database.Database {
  const dbPath = path.join(process.cwd(), 'temeh.db')
  return new Database(dbPath)
}

async function getActorId(email?: string) {
    if (!email || email === "system") return null;
    const user = await getStaffByEmail(email);
    return user ? Number(user.id) : null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb()
  
  try {
    const { is_pinned, userEmail } = await request.json()
    const { id } = await params
    const noteId = parseInt(id)

    const stmt = db.prepare(`
      UPDATE notes 
      SET is_pinned = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    
    const result = stmt.run(is_pinned ? 1 : 0, noteId)
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    // Fetch and return the complete updated note
    const getStmt = db.prepare(`
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
      WHERE id = ?
    `)
    
    const note: any = getStmt.get(noteId)
    
    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    const actorId = await getActorId(userEmail);
    await addActivityLog(
        actorId,
        'NOTE_PIN',
        `${is_pinned ? 'Pinned' : 'Unpinned'} note: ${note.title}`,
        note.title,
        { is_pinned }
    );

    const updatedNote = {
      ...note,
      id: note.id.toString(),
      tags: note.tags ? JSON.parse(note.tags) : [],
      is_pinned: Boolean(note.is_pinned)
    }

    return NextResponse.json(updatedNote)
  } catch (error) {
    console.error('Error updating note pin status:', error)
    return NextResponse.json(
      { error: 'Failed to update note pin status' },
      { status: 500 }
    )
  } finally {
    db.close()
  }
} 
