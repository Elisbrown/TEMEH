
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db');

function getDb(): Database.Database {
    return new Database(dbPath);
}

export type DBNotification = {
    id: string;
    title: string;
    description: string;
    type: string;
    is_read: number;
    created_at: string;
    user_id?: string;
}

export async function getNotifications(limit: number = 50): Promise<DBNotification[]> {
    const db = getDb();
    try {
        return db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?').all(limit) as DBNotification[];
    } finally {
        db.close();
    }
}

export async function createNotification(notification: { title: string, description: string, type?: string, user_id?: string }) {
    const db = getDb();
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const createdAt = new Date().toISOString();
    try {
        db.prepare('INSERT INTO notifications (id, title, description, type, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            .run(id, notification.title, notification.description, notification.type || 'info', notification.user_id || null, createdAt);
        return { id, ...notification, is_read: 0, created_at: createdAt };
    } finally {
        db.close();
    }
}

export async function markNotificationAsRead(id: string) {
    const db = getDb();
    try {
        db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
    } finally {
        db.close();
    }
}

export async function markAllNotificationsAsRead() {
    const db = getDb();
    try {
        db.prepare('UPDATE notifications SET is_read = 1').run();
    } finally {
        db.close();
    }
}

export async function clearAllNotifications() {
    const db = getDb();
    try {
        db.prepare('DELETE FROM notifications').run();
    } finally {
        db.close();
    }
}
