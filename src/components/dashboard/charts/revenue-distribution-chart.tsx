"use client"

import { useTranslation } from '@/hooks/use-translation'
import { useLanguage } from '@/context/language-context'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

type RevenueDistributionData = {
  label: string
  value: number
  color: string
}

type RevenueDistributionChartProps = {
  data?: RevenueDistributionData[]
}

export function RevenueDistributionChart({ data }: RevenueDistributionChartProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const chartData = data || [];
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

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

  return (
    <div className="space-y-6">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              nameKey="label"
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
        {chartData.map((item, index) => {
          const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
          
          return (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {item.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(item.value)} ({percentage}%)
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
