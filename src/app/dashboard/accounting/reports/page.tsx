// Financial reports page
"use client"

import { Header } from '@/components/dashboard/header'
import { useAuth } from '@/context/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock } from 'lucide-react'
import { useTranslation } from '@/hooks/use-translation'
import { ReportViewer } from '@/components/dashboard/accounting/report-viewer'
import { SyncDataButton } from '@/components/dashboard/accounting/sync-data-button'

function ReportsContent() {
    const { t } = useTranslation()
    
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Financial Reports</h2>
                    <p className="text-sm text-muted-foreground">Generate and view financial reports</p>
                </div>
                <SyncDataButton />
            </div>

            <div className="grid gap-6">
                <ReportViewer
                    reportType="profit-loss"
                    title={t('accounting.reports.pnl')}
                    description={t('accounting.reports.pnlDesc')}
                />

                <ReportViewer
                    reportType="balance-sheet"
                    title={t('accounting.reports.balanceSheet')}
                    description={t('accounting.reports.balanceSheetDesc')}
                />

                <ReportViewer
                    reportType="cash-flow"
                    title={t('accounting.reports.cashFlow')}
                    description={t('accounting.reports.cashFlowDesc')}
                />
            </div>
        </div>
    )
}

export default function FinancialReportsPage() {
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
                <Header title={t('accounting.reports.title')} />
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
            <Header title={t('accounting.reports.title')} />
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                <ReportsContent />
            </main>
        </div>
    )
}
