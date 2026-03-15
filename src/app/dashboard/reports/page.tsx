
"use client"

import { Header } from '@/components/dashboard/header'
import { ReportsView } from '@/components/dashboard/reports/reports-view'
import { useTranslation } from '@/hooks/use-translation'

export default function ReportsPage() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title={t('reports.title')} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <ReportsView />
      </main>
    </div>
  )
}
