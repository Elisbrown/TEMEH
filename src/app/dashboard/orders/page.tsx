
"use client"

import { Header } from '@/components/dashboard/header'
import { OrdersView } from '@/components/dashboard/orders/orders-view'
import { useAuth } from '@/context/auth-context'
import { useTranslation } from '@/hooks/use-translation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Lock } from 'lucide-react'

export default function OrdersPage() {
  const { user } = useAuth()
  const { t } = useTranslation()

  const canViewPage = () => {
    if (!user) return false
    const allowedRoles = ["Cashier", "Manager", "Super Admin"];
    return allowedRoles.includes(user.role)
  }

  if (!canViewPage()) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <Header title={t('orders.title')} />
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
      <Header title={t('orders.title')} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">{t('orders.allOrders')}</CardTitle>
                <CardDescription>{t('orders.allOrdersDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
                <OrdersView />
            </CardContent>
        </Card>
      </main>
    </div>
  )
}
