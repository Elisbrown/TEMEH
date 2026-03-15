
"use client"

import { Header } from '@/components/dashboard/header'
import { StaffTable } from '@/components/dashboard/staff/staff-table'
import { StaffProvider } from '@/context/staff-context'
import { useTranslation } from '@/hooks/use-translation'
import { PageOnboarding } from '@/components/dashboard/onboarding/page-onboarding'

export default function StaffPage() {
  const { t } = useTranslation()

  return (
    <StaffProvider>
            <div className="flex min-h-screen w-full flex-col">
            <PageOnboarding page="staff" />
            <Header title={t('staff.title')} />
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                <StaffTable />
            </main>
            </div>
    </StaffProvider>
  )
}
