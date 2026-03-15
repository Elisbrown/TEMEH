"use client"

import { useState, useMemo } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslation } from '@/hooks/use-translation'
import { useLanguage } from '@/context/language-context'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, TooltipProps } from "recharts"
import { formatCurrency } from "@/lib/utils"
import { useSettings } from "@/context/settings-context"

type ChartDataPoint = {
  label: string;
  current: number;
  previous: number;
}

type ChartData = {
  sales: ChartDataPoint[];
  revenue: ChartDataPoint[];
}

type DashboardChartsProps = {
  data: ChartData;
}

export function DashboardCharts({ data }: DashboardChartsProps) {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { settings } = useSettings()
  const [selectedMetric, setSelectedMetric] = useState<'sales' | 'revenue'>('sales');

  const chartData = useMemo(() => {
    if (!data || !data[selectedMetric]) return [];
    return data[selectedMetric];
  }, [data, selectedMetric]);

  const hasData = chartData.some(d => d.current > 0);

  const formatMetricValue = (value: number) => {
    if (selectedMetric === 'sales') {
      return value.toLocaleString();
    }
    return formatCurrency(value, settings.defaultCurrency);
  };

  const getMetricColor = () => {
    switch (selectedMetric) {
      case 'sales': return 'hsl(var(--primary))';
      case 'revenue': return '#10b981'; // Green
      default: return 'hsl(var(--primary))';
    }
  };

  const metricColor = getMetricColor();

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      // Format the label (date/time)
      let displayLabel = label;
      if (label.includes(':')) {
        displayLabel = label.split(':')[0] + 'h';
      } else {
        const date = new Date(label);
        if (!isNaN(date.getTime())) {
          displayLabel = new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          }).format(date);
        }
      }

      return (
        <div className="bg-card border border-border p-3 rounded-lg shadow-lg">
          <p className="text-xs font-semibold mb-2">{displayLabel}</p>
          <div className="space-y-1">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: entry.color }} 
                  />
                  <span className="text-[10px] text-muted-foreground uppercase">
                    {selectedMetric === 'sales' ? t('dashboard.totalOrders') : t('dashboard.totalRevenue')}
                  </span>
                </div>
                <span className="text-xs font-bold">
                  {formatMetricValue(entry.value || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <Tabs value={selectedMetric} onValueChange={(v: string) => setSelectedMetric(v as any)} className="w-full">
        <div className="flex items-center justify-between mb-4">
            <TabsList>
                <TabsTrigger value="sales">{t('dashboard.totalOrders')}</TabsTrigger>
                <TabsTrigger value="revenue">{t('dashboard.totalRevenue')}</TabsTrigger>
            </TabsList>
        </div>

        {/* Chart Container */}
        <div className="relative bg-muted/5 rounded-xl border border-border/50 p-6 h-[350px]">
            {!hasData ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm uppercase tracking-wider">
                    {t('dashboard.noData')}
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                            <linearGradient id="dashboardMetricGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={metricColor} stopOpacity={0.2}/>
                                <stop offset="95%" stopColor={metricColor} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                        <XAxis 
                            dataKey="label" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                            tickMargin={12}
                            minTickGap={30}
                            tickFormatter={(value) => {
                                if (value.includes(':')) return value.split(':')[0] + 'h';
                                const date = new Date(value);
                                if (isNaN(date.getTime())) return value;
                                return new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', { 
                                    month: 'short', 
                                    day: 'numeric' 
                                }).format(date);
                            }}
                        />
                        <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                            tickFormatter={(value) => {
                                if (selectedMetric === 'sales') return value.toString();
                                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                                return value;
                            }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="current"
                            stroke={metricColor}
                            strokeWidth={2}
                            fill="url(#dashboardMetricGradient)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>

        {/* Summary stats */}
        {hasData && (
            <div className="grid grid-cols-2 gap-8 text-center mt-6 p-4 rounded-xl bg-muted/5 border border-border/50">
                <div className="space-y-1">
                    <div className="text-2xl font-bold tracking-tight">
                        {formatMetricValue(chartData.reduce((sum: number, d: ChartDataPoint) => sum + d.current, 0))}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{t('dashboard.currentTotal')}</div>
                </div>
                <div className="space-y-1">
                    <div className="text-2xl font-bold tracking-tight">
                        {formatMetricValue(Math.max(...chartData.map((d: ChartDataPoint) => d.current)))}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{t('dashboard.peakValue')}</div>
                </div>
            </div>
        )}
      </Tabs>
    </div>
  );
}