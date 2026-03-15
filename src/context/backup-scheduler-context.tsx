// src/context/backup-scheduler-context.tsx
'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { backupScheduler } from '@/lib/services/backup-scheduler';

interface BackupSchedulerContextType {
    isRunning: boolean;
}

const BackupSchedulerContext = createContext<BackupSchedulerContextType>({
    isRunning: false,
});

export function useBackupScheduler() {
    return useContext(BackupSchedulerContext);
}

export function BackupSchedulerProvider({ children }: { children: React.ReactNode }) {
    const [isRunning, setIsRunning] = React.useState(false);

    useEffect(() => {
        // Start the scheduler when the component mounts
        backupScheduler.start();
        setIsRunning(true);

        // Clean up when unmounting
        return () => {
            backupScheduler.stop();
            setIsRunning(false);
        };
    }, []);

    return (
        <BackupSchedulerContext.Provider value={{ isRunning }}>
            {children}
        </BackupSchedulerContext.Provider>
    );
}
