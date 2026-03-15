// Financial journals page
"use client"

import { useState, useEffect } from 'react'
import { Header } from '@/components/dashboard/header'
import { useAuth } from '@/context/auth-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Lock, DollarSign, ShoppingCart, Book, Plus, RefreshCw } from 'lucide-react'
import { useTranslation } from '@/hooks/use-translation'
import { JournalEntryForm } from '@/components/dashboard/accounting/journal-entry-form'
import { JournalEntriesTable } from '@/components/dashboard/accounting/journal-entries-table'
import { useToast } from '@/hooks/use-toast'

function JournalsContent() {
    const { t } = useTranslation()
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)
    const [syncing, setSyncing] = useState(false)
    const [syncStatus, setSyncStatus] = useState<any>(null)
    const { toast } = useToast()

    const handleSuccess = () => {
        setRefreshKey(prev => prev + 1)
    }

    const checkSyncStatus = async () => {
        try {
            const response = await fetch('/api/accounting/sync')
            if (response.ok) {
                const data = await response.json()
                setSyncStatus(data)
            }
        } catch (error) {
            console.error('Failed to check sync status:', error)
        }
    }

    const handleSync = async () => {
        try {
            setSyncing(true)
            const response = await fetch('/api/accounting/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            })

            if (response.ok) {
                const data = await response.json()
                toast({
                    title: "Sync Complete",
                    description: data.message
                })
                handleSuccess()
                checkSyncStatus()
            } else {
                toast({
                    variant: "destructive",
                    title: "Sync Failed",
                    description: "Failed to sync transactions"
                })
            }
        } catch (error) {
            console.error('Sync error:', error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to sync transactions"
            })
        } finally {
            setSyncing(false)
        }
    }

    useEffect(() => {
        checkSyncStatus()
    }, [])
    
    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Journal Entries</h2>
                    <p className="text-sm text-muted-foreground">Manage your accounting journal entries</p>
                    {syncStatus && syncStatus.totalUnsynced > 0 && (
                        <p className="text-sm text-orange-600 mt-1">
                            {syncStatus.totalUnsynced} unsynced transactions available
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleSync} disabled={syncing} variant="outline">
                        <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync from POS'}
                    </Button>
                    <Button onClick={() => setIsFormOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Entry
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="all"><Book className="mr-2 h-4 w-4" />All Entries</TabsTrigger>
                    <TabsTrigger value="sales"><DollarSign className="mr-2 h-4 w-4" />{t('accounting.journals.sales')}</TabsTrigger>
                    <TabsTrigger value="expense"><ShoppingCart className="mr-2 h-4 w-4" />{t('accounting.journals.expenses')}</TabsTrigger>
                    <TabsTrigger value="general"><Book className="mr-2 h-4 w-4" />{t('accounting.journals.generalLedger')}</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-6">
                    <JournalEntriesTable key={refreshKey} onRefresh={handleSuccess} />
                </TabsContent>

                <TabsContent value="sales" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('accounting.journals.sales')}</CardTitle>
                            <CardDescription>{t('accounting.journals.salesDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <JournalEntriesTable key={refreshKey} type="sales" onRefresh={handleSuccess} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="expense" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('accounting.journals.expenses')}</CardTitle>
                            <CardDescription>{t('accounting.journals.expensesDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <JournalEntriesTable key={refreshKey} type="expense" onRefresh={handleSuccess} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="general" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('accounting.journals.generalLedger')}</CardTitle>
                            <CardDescription>{t('accounting.journals.generalLedgerDesc')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <JournalEntriesTable key={refreshKey} type="general" onRefresh={handleSuccess} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <JournalEntryForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSuccess={handleSuccess}
            />
        </>
    )
}

export default function JournalsPage() {
    const { user } = useAuth()
    const { t } = useTranslation()

    const canViewPage = () => {
        if (!user) return false
        const allowedRoles = ["Manager", "Super Admin", "Accountant"]
        return allowedRoles.includes(user.role)
    }

    if (!canViewPage()) {
        return (
            <div className="flex min-h-screen w-full flex-col">
                <Header title={t('accounting.journals.title')} />
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

    return (
         <div className="flex min-h-screen w-full flex-col">
            <Header title={t('accounting.journals.title')} />
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                <JournalsContent />
            </main>
        </div>
    )
}
