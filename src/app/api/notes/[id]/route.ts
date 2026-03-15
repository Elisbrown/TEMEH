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
    const { title, content, tags } = await request.json()
    const { id } = await params
    const noteId = parseInt(id)

    if (!title || !content) {
      return Response.json(
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
      return Response.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    const updatedNote = {
      id: noteId.toString(),
      title,
      content,
      tags: tags || [],
      updated_at: new Date().toISOString()
    }

    return Response.json(updatedNote)
  } catch (error) {
    console.error('Error updating note:', error)
    return Response.json(
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

    const stmt = db.prepare('DELETE FROM notes WHERE id = ?')
    const result = stmt.run(noteId)

    if (result.changes === 0) {
      return Response.json(
        { error: 'Note not found' },
        { status: 404 }
      )
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error deleting note:', error)
    return Response.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    )
  } finally {
    db.close()
  }
} 