
// New page for viewing activity logs
"use client"

import { Header } from '@/components/dashboard/header'
import { ActivityLogTable } from '@/components/dashboard/activity/activity-log-table'
import { useAuth } from '@/context/auth-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Lock, History } from 'lucide-react'
import { useTranslation } from '@/hooks/use-translation'
import { useActivityLog } from '@/hooks/use-activity-log'

function ActivityPageContent() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { logs } = useActivityLog()

  const canViewPage = () => {
    if (!user) return false
    const allowedRoles = ["Manager", "Super Admin"]
    return allowedRoles.includes(user.role)
  }

  if (!canViewPage()) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <Header title={t('activity.title')} />
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
                <p className="text-sm text-muted-foreground mt-2">{t('dialogs.contactAdmin')}</p>
            </CardContent>
           </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title={t('activity.title')} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
                <History className="h-6 w-6" />
                <div>
                    <CardTitle className="font-headline">{t('activity.title')}</CardTitle>
                    <CardDescription>{t('activity.description')}</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <ActivityLogTable logs={logs} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function ActivityPage() {
    return <ActivityPageContent />
}
