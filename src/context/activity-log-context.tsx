// New context for logging user activities
"use client"

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useAuth } from './auth-context';
import type { User } from './auth-context';

export type ActivityLog = {
    id: number;
    user_id: number | null;
    action: string;
    target: string | null;
    details: string | null;
    metadata: any;
    timestamp: string;
    user?: {
        name: string;
        email: string;
        avatar: string;
    };
};

type ActivityLogContextType = {
    logs: ActivityLog[];
    logActivity: (action: string, details: string, target?: string | null, metadata?: any) => void;
    clearLogs: () => void;
    fetchLogs: () => Promise<void>;
};

export const ActivityLogContext = createContext<ActivityLogContextType | undefined>(undefined);

export const ActivityLogProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const [logs, setLogs] = useState<ActivityLog[]>([]);

    const fetchLogs = useCallback(async () => {
        try {
            const response = await fetch('/api/activity-logs');
            if (response.ok) {
                const data = await response.json();
                setLogs(prev => {
                    if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
                    return data;
                });
            } else {
                console.error('Failed to fetch activity logs');
            }
        } catch (error) {
            console.error('Error fetching activity logs:', error);
        }
    }, []);

    useEffect(() => {
        fetchLogs(); // Initial fetch
        const interval = setInterval(fetchLogs, 120000); // Poll every 120 seconds
        return () => clearInterval(interval);
    }, [fetchLogs]);

    const logActivity = useCallback(async (action: string, details: string, target: string | null = null, metadata: any = null) => {
        if (!user) return; // Only log if a user is signed in

        try {
            const response = await fetch('/api/activity-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: null,
                    action, 
                    details,
                    target,
                    metadata,
                    userEmail: user.email
                })
            });

            if (response.ok) {
                await fetchLogs();
            } else {
                console.error('Failed to log activity');
            }
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }, [user, fetchLogs]);

    const clearLogs = useCallback(async () => {
        try {
            const response = await fetch('/api/activity-logs', {
                method: 'DELETE'
            });

            if (response.ok) {
                setLogs([]);
            } else {
                console.error('Failed to clear activity logs');
            }
        } catch (error) {
            console.error('Error clearing activity logs:', error);
        }
    }, []);

    return (
        <ActivityLogContext.Provider value={{ logs, logActivity, clearLogs, fetchLogs }}>
            {children}
        </ActivityLogContext.Provider>
    );
};

export const useActivityLog = () => {
    const context = useContext(ActivityLogContext);
    if (context === undefined) {
        throw new Error('useActivityLog must be used within an ActivityLogProvider');
    }
    return context;
};
