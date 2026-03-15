
// New file for notification context

"use client"

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';

export type Notification = {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  type: 'alert' | 'info';
};

type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const lastPlayedId = React.useRef<string | null>(null);

  // Initialize from localStorage on client side
  React.useEffect(() => {
    lastPlayedId.current = localStorage.getItem('lastPlayedNotificationId');
  }, []);

  const playSound = (id: string) => {
    const audio = new Audio('/audio/notification.mp3');
    audio.play().catch(e => console.log("Audio play failed - interaction needed or file missing", e));
    localStorage.setItem('lastPlayedNotificationId', id);
    lastPlayedId.current = id;
  }

  // Poll for notifications
  React.useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          const mapped: Notification[] = data.map((n: any) => ({
            id: n.id,
            title: n.title,
            description: n.description,
            timestamp: new Date(n.created_at),
            read: n.is_read === 1,
            type: n.type
          }));

          if (mapped.length > 0) {
            const latest = mapped[0];
            // Only play sound if this notification ID is different from the last one played
            if (latest.id !== lastPlayedId.current) {
              // On first load or after refresh, only play if it's very recent (last 15 seconds)
              const isRecent = (new Date().getTime() - latest.timestamp.getTime()) < 60000;

              if (isRecent) {
                playSound(latest.id);
              } else {
                // If it's old, just mark it as "seen" by the sound system so we don't play it later
                lastPlayedId.current = latest.id;
                localStorage.setItem('lastPlayedNotificationId', latest.id);
              }
            }
          }

          setNotifications(prev => {
            if (JSON.stringify(prev) === JSON.stringify(mapped)) return prev;
            return mapped;
          });
        }
      } catch (e) {
        console.error("Failed to fetch notifications", e);
      }
    };

    fetchNotifications(); // Initial fetch
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const addNotification = useCallback(async (notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        body: JSON.stringify(notificationData)
      });
      // We don't need to manually set state here because the polling will pick it up
      // But for instant feedback we could optimistically update
    } catch (e) {
      console.error("Failed to add notification", e);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', id })
    });
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_all_read' })
    });
  }, []);

  const clearNotifications = useCallback(async () => {
    setNotifications([]);
    await fetch('/api/notifications', {
      method: 'DELETE'
    });
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearNotifications }}>
      {children}
      {/* Hidden audio element if needed, but using new Audio() implies programmatic playback */}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
