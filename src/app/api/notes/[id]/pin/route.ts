import { NextRequest } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'

function getDb(): Database.Database {
  const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db')
  return new Database(dbPath)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb()

  try {
    const { is_pinned } = await request.json()
    const { id } = await params
    const noteId = parseInt(id)

    const stmt = db.prepare(`
      UPDATE notes 
      SET is_pinned = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)

    const result = stmt.run(is_pinned ? 1 : 0, noteId)

    if (result.changes === 0) {
      return Response.json(
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
      return Response.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    const updatedNote = {
      ...note,
      id: note.id.toString(),
      tags: note.tags ? JSON.parse(note.tags) : [],
      is_pinned: Boolean(note.is_pinned)
    }

    return Response.json(updatedNote)
  } catch (error) {
    console.error('Error updating note pin status:', error)
    return Response.json(
      { error: 'Failed to update note pin status' },
      { status: 500 }
    )
  } finally {
    db.close()
  }
} 