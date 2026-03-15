import { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type KpiCardProps = {
  title: string
  value: string
  change: string
  icon: ReactNode
  trend?: ReactNode
  trendColor?: string
  variant?: 'default' | 'warning' | 'destructive'
}

export function KpiCard({ title, value, change, icon, trend, trendColor, variant = 'default' }: KpiCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950';
      case 'destructive':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950';
      default:
        return '';
    }
  };

  return (
    <Card className={cn(getVariantStyles())}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center gap-1">
          {trend}
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className={cn("text-xs text-muted-foreground", trendColor)}>
          {change}
        </p>
      </CardContent>
    </Card>
  )
}
