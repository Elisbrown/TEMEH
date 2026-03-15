// New hook to simplify logging activities
"use client"
import { useContext } from 'react';
import { ActivityLogContext } from '@/context/activity-log-context';

export const useActivityLog = () => {
    const context = useContext(ActivityLogContext);
    if (!context) {
        throw new Error('useActivityLog must be used within an ActivityLogProvider');
    }
    return context;
};
