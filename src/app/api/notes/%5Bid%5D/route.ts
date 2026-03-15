
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
    const { title, content, tags, userEmail } = await request.json()
    const { id } = await params
    const noteId = parseInt(id)

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const stmt = db.prepare(`
      UPDATE notes 
      SET title = ?, content = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    
    const result = stmt.run(title, content, JSON.stringify(tags || []), noteId)
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    const actorId = await getActorId(userEmail);
    await addActivityLog(
        actorId,
        'NOTE_UPDATE',
        `Updated note: ${title}`,
        title,
        { tags: tags || [] }
    );

    const updatedNote = {
      id: noteId.toString(),
      title,
      content,
      tags: tags || [],
      updated_at: new Date().toISOString()
    }

    return NextResponse.json(updatedNote)
  } catch (error) {
    console.error('Error updating note:', error)
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    )
  } finally {
    db.close()
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb()
  
  try {
    const { id } = await params
    const noteId = parseInt(id)
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    // Fetch note for logging before deletion
    const getStmt = db.prepare('SELECT title FROM notes WHERE id = ?')
    const note: any = getStmt.get(noteId)

    const stmt = db.prepare('DELETE FROM notes WHERE id = ?')
    const result = stmt.run(noteId)
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    const actorId = await getActorId(userEmail || undefined);
    await addActivityLog(
        actorId,
        'NOTE_DELETE',
        `Deleted note: ${note?.title || id}`,
        note?.title || String(id)
    );

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    )
  } finally {
    db.close()
  }
} 
