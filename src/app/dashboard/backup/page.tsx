
"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Header } from '@/components/dashboard/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth-context'
import { Lock, Server, Database, AlertTriangle, HardDrive, RotateCw, History, Download, Upload, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import { useTranslation } from '@/hooks/use-translation'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'

function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString();
}

interface BackupRecord {
    id: number;
    filename: string;
    size: number;
    created_at: string;
    type: 'manual' | 'automatic';
    status: string;
    created_by?: string;
}

interface BackupSettings {
    id: number;
    frequency: string;
    last_backup?: string;
    next_backup?: string;
    enabled: boolean;
}

function BackupPageContent() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { toast } = useToast()
  const [isRestoreConfirmOpen, setRestoreConfirmOpen] = useState(false)
  const [backupFile, setBackupFile] = useState<File | null>(null)
  const [systemStats, setSystemStats] = useState({ dbSize: 0, serverUsedStorage: 0, serverTotalStorage: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [backupHistory, setBackupHistory] = useState<BackupRecord[]>([]);
  const [backupSettings, setBackupSettings] = useState<BackupSettings | null>(null);
  const [deleteBackupId, setDeleteBackupId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch system stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/system-stats');
        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        setSystemStats(data);
      } catch (error) {
        console.error("Failed to fetch system stats:", error);
      }
    }
    fetchStats();
  }, []);

  // Fetch backup history
  const fetchBackupHistory = async () => {
    try {
      const response = await fetch('/api/backup/history');
      if (response.ok) {
        const data = await response.json();
        setBackupHistory(data);
      }
    } catch (error) {
      console.error("Failed to fetch backup history:", error);
    }
  };

  // Fetch backup settings
  const fetchBackupSettings = async () => {
    try {
      const response = await fetch('/api/backup/settings');
      if (response.ok) {
        const data = await response.json();
        setBackupSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch backup settings:", error);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchBackupHistory();
    fetchBackupSettings();
  }, []);
  
  const handleManualBackup = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/backup?userEmail=${user?.email || ''}`);
      if (!response.ok) {
        throw new Error('Backup failed');
      }
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'temeh_backup.db';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast({ title: t('toasts.backupSuccess'), description: t('toasts.backupSuccessDesc') })
      
      // Refresh history
      setTimeout(() => fetchBackupHistory(), 1000);
    } catch (error) {
      console.error('Backup failed:', error)
      toast({ variant: 'destructive', title: t('toasts.backupFailed'), description: t('toasts.backupFailedDesc') })
    } finally {
        setIsLoading(false);
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && (file.type === 'application/x-sqlite3' || file.name.endsWith('.db') || file.name.endsWith('.sqlite') || file.name.endsWith('.sqlite3'))) {
      setBackupFile(file)
      setRestoreConfirmOpen(true)
    } else {
      toast({ variant: 'destructive', title: t('toasts.invalidFile'), description: "Please select a valid SQLite backup file (.db)." })
    }
    if (event.target) {
        event.target.value = ''
    }
  }

  const handleRestore = async () => {
    if (!backupFile) return;
    setIsLoading(true);
    
    const formData = new FormData();
    formData.append('backupFile', backupFile);
    formData.append('userEmail', user?.email || '');

    try {
        const response = await fetch('/api/backup', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Restore failed');
        }

        toast({
            title: "Restore Successful",
            description: "Database restored. The application will now reload.",
        });

        setTimeout(() => {
            window.location.reload();
        }, 2000);

    } catch (error: any) {
        console.error('Restore failed:', error);
        toast({ variant: 'destructive', title: t('toasts.restoreFailed'), description: error.message || t('toasts.restoreFailedDesc') });
    } finally {
        setBackupFile(null);
        setRestoreConfirmOpen(false);
        setIsLoading(false);
    }
  }

  const handleDownloadBackup = async (filename: string) => {
    try {
      const response = await fetch('/api/backup/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, userEmail: user?.email }),
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({ title: "Downloaded", description: "Backup file downloaded successfully." });
    } catch (error) {
      console.error('Download failed:', error);
      toast({ variant: 'destructive', title: "Error", description: "Failed to download backup." });
    }
  };

  const handleDeleteBackup = async (id: number) => {
    try {
      const response = await fetch(`/api/backup/history?id=${id}&userEmail=${user?.email || ''}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Delete failed');

      toast({ title: "Deleted", description: "Backup deleted successfully." });
      fetchBackupHistory();
    } catch (error) {
      console.error('Delete failed:', error);
      toast({ variant: 'destructive', title: "Error", description: "Failed to delete backup." });
    }
    setDeleteBackupId(null);
  };

  const handleUpdateBackupSettings = async (frequency: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/backup/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency, enabled, userEmail: user?.email }),
      });

      if (!response.ok) throw new Error('Update failed');

      const data = await response.json();
      setBackupSettings(data);

      toast({ title: "Updated", description: "Backup settings saved successfully." });
    } catch (error) {
      console.error('Update failed:', error);
      toast({ variant: 'destructive', title: "Error", description: "Failed to update backup settings." });
    }
  };

  const storageUsagePercent = (systemStats.serverUsedStorage / systemStats.serverTotalStorage) * 100;

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title={t('backup.title')} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
              <Server className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="font-headline">{t('backup.systemStatus')}</CardTitle>
                <CardDescription>{t('backup.systemHealth')}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className='text-sm'>
                  <div className="flex justify-between">
                    <span className="flex items-center"><HardDrive className="mr-2 h-4 w-4" /> {t('backup.storage')}</span>
                    <span className="font-mono">{formatBytes(systemStats.serverUsedStorage)} / {formatBytes(systemStats.serverTotalStorage)}</span>
                  </div>
                  <Progress value={storageUsagePercent} className="h-2 mt-1" />
              </div>
              <div className='text-sm'>
                  <div className="flex justify-between">
                    <span className="flex items-center"><Database className="mr-2 h-4 w-4" /> Database Size</span>
                    <span className="font-mono">{formatBytes(systemStats.dbSize)}</span>
                  </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
                <CardTitle className="font-headline">{t('backup.manualBackup')}</CardTitle>
                <CardDescription>{t('backup.manualBackupDesc')}</CardDescription>
            </CardHeader>
            <CardFooter>
                <Button onClick={handleManualBackup} disabled={isLoading}>
                    <Download className="mr-2 h-4 w-4" />
                    {isLoading ? "Backing up..." : t('backup.downloadNow')}
                </Button>
            </CardFooter>
          </Card>
          
          <Card className="border-destructive">
            <CardHeader>
                <div className='flex items-center gap-2'>
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                    <CardTitle className="font-headline text-destructive">{t('backup.restore')}</CardTitle>
                </div>
                <CardDescription>{t('backup.restoreDesc')}</CardDescription>
            </CardHeader>
            <CardFooter>
                <Button variant="destructive" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                    <Upload className="mr-2 h-4 w-4" />
                    {isLoading ? "Restoring..." : t('backup.uploadAndRestore')}
                </Button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".db,.sqlite,.sqlite3,application/x-sqlite3" onChange={handleFileSelect} />
            </CardFooter>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><RotateCw className="h-5 w-5" />{t('backup.autoBackup')}</CardTitle>
                    <CardDescription>{t('backup.autoBackupDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Select 
                        value={backupSettings?.frequency || "daily"} 
                        onValueChange={(value) => {
                            handleUpdateBackupSettings(value, backupSettings?.enabled || false);
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="daily">{t('backup.daily')}</SelectItem>
                            <SelectItem value="weekly">{t('backup.weekly')}</SelectItem>
                            <SelectItem value="monthly">{t('backup.monthly')}</SelectItem>
                            <SelectItem value="disabled">{t('backup.disabled')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Enable Automatic Backups</span>
                        <Button 
                            variant={backupSettings?.enabled ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleUpdateBackupSettings(
                                backupSettings?.frequency || 'daily',
                                !backupSettings?.enabled
                            )}
                        >
                            {backupSettings?.enabled ? 'Enabled' : 'Disabled'}
                        </Button>
                    </div>
                    {backupSettings?.enabled && backupSettings?.next_backup && (
                        <p className="text-xs text-muted-foreground">
                            Next backup: {formatDate(backupSettings.next_backup)}
                        </p>
                    )}
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><History className="h-5 w-5" />{t('backup.history')}</CardTitle>
                    <CardDescription>{t('backup.historyDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {backupHistory.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">{t('backup.noHistory')}</p>
                    ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {backupHistory.map((backup) => (
                                <div key={backup.id} className="flex items-center justify-between p-2 border rounded-md">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{backup.filename}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDate(backup.created_at)} • {formatBytes(backup.size)} • {backup.type}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button 
                                            variant="ghost" 
                                            size="icon"
                                            onClick={() => handleDownloadBackup(backup.filename)}
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon"
                                            onClick={() => setDeleteBackupId(backup.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </main>
      
      <DeleteConfirmationDialog
        open={isRestoreConfirmOpen}
        onOpenChange={setRestoreConfirmOpen}
        onConfirm={handleRestore}
        title={t('dialogs.areYouSure')}
        description={t('dialogs.restoreWarning')}
      />
      
      <DeleteConfirmationDialog
        open={deleteBackupId !== null}
        onOpenChange={(open) => !open && setDeleteBackupId(null)}
        onConfirm={() => deleteBackupId && handleDeleteBackup(deleteBackupId)}
        title="Delete Backup"
        description="Are you sure you want to delete this backup? This action cannot be undone."
      />
    </div>
  )
}


export default function BackupPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const isAuthorized = user?.role === 'Manager' || user?.role === 'Super Admin'

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <Header title={t('backup.title')} />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
           <Card className="flex flex-col items-center justify-center p-10 text-center">
            <CardHeader>
                <div className="mx-auto bg-muted rounded-full p-4">
                    <Lock className="h-12 w-12 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">{t('dialogs.accessDenied')}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">{t('dialogs.permissionDenied')}</p>
            </CardContent>
           </Card>
        </main>
      </div>
    )
  }

  return <BackupPageContent />
}
