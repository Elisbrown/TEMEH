"use client"

import { useMemo } from 'react'
import { useTranslation } from '@/hooks/use-translation'
import { useLanguage } from '@/context/language-context'

type CategorySalesData = {
  category: string
  sales: number
  color: string
}

type CategorySalesChartProps = {
  data?: CategorySalesData[]
}

// Simple bar chart using CSS
export function CategorySalesChart({ data }: CategorySalesChartProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const chartData = data || [];
  const maxSales = chartData.length > 0 ? Math.max(...chartData.map(d => d.sales)) : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground italic">
        {t('dashboard.noData')}
      </div>
    );
  }

  const totalSalesOverall = chartData.reduce((sum, item) => sum + item.sales, 0);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {chartData.map((item, index) => {
          const widthPercentage = maxSales > 0 ? (item.sales / maxSales) * 100 : 0;
          const sharePercentage = totalSalesOverall > 0 ? (item.sales / totalSalesOverall) * 100 : 0;
          
          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {item.category}
                </span>
                <span className="text-muted-foreground">{formatCurrency(item.sales)}</span>
              </div>
              <div className="h-8 bg-muted rounded-md overflow-hidden relative">
                <div
                  className="h-full transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ 
                    width: `${widthPercentage}%`,
                    backgroundColor: item.color || 'hsl(var(--primary))'
                  }}
                >
                  {sharePercentage > 5 && (
                    <span className="text-xs text-primary-foreground font-medium z-10">
                      {sharePercentage.toFixed(0)}%
                    </span>
                  )}
                </div>
                {sharePercentage <= 5 && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                    {sharePercentage.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div className="text-center">
          <div className="text-2xl font-bold">
            {formatCurrency(chartData.reduce((sum, item) => sum + item.sales, 0))}
          </div>
          <div className="text-xs text-muted-foreground">{t('dashboard.totalSales')}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{chartData.length}</div>
          <div className="text-xs text-muted-foreground">{t('dashboard.categories')}</div>
        </div>
      </div>
    </div>
  );
}
