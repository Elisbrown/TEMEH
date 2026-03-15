// src/lib/services/backup-scheduler.ts
'use client';

import { createBackup, getBackupSettings, BackupSettings } from '@/lib/db/backup';

export class BackupScheduler {
    private intervalId: NodeJS.Timeout | null = null;
    private checkIntervalMs = 10 * 60 * 1000; // Check every 10 minutes
    private isRunning = false;

    constructor() {
        this.checkAndRunBackup = this.checkAndRunBackup.bind(this);
    }

    start() {
        if (this.isRunning) {
            console.log('Backup scheduler already running');
            return;
        }

        console.log('Starting backup scheduler');
        this.isRunning = true;

        // Check immediately on start
        this.checkAndRunBackup();

        // Then check every 10 minutes
        this.intervalId = setInterval(this.checkAndRunBackup, this.checkIntervalMs);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('Backup scheduler stopped');
    }

    private async checkAndRunBackup() {
        try {
            // Fetch current backup settings
            const response = await fetch('/api/backup/settings');
            if (!response.ok) return;

            const settings: BackupSettings = await response.json();

            // If backups are disabled or frequency is 'disabled', skip
            if (!settings.enabled || settings.frequency === 'disabled') {
                return;
            }

            // If next_backup is not set, skip
            if (!settings.next_backup) {
                return;
            }

            // Check if it's time to run a backup
            const now = new Date().getTime();
            const nextBackup = new Date(settings.next_backup).getTime();

            if (now >= nextBackup) {
                console.log('Running automatic backup...');
                await this.triggerAutoBackup();
            }
        } catch (error) {
            console.error('Error checking backup schedule:', error);
        }
    }

    private async triggerAutoBackup() {
        try {
            // Call the automatic backup API endpoint
            const response = await fetch('/api/backup/auto', {
                method: 'POST',
            });

            if (response.ok) {
                console.log('Automatic backup completed successfully');
            } else {
                console.error('Automatic backup failed');
            }
        } catch (error) {
            console.error('Failed to trigger automatic backup:', error);
        }
    }
}

// Export singleton instance
export const backupScheduler = new BackupScheduler();
