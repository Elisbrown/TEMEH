
"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { formatCurrency } from "@/lib/utils"
import { useSettings } from "@/context/settings-context"
import { useTranslation } from "@/hooks/use-translation"
import { useLanguage } from "@/context/language-context"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartConfig = {
  sales: {
    label: "dashboard.orders",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export function RecentSales({ data }: { data: any[] }) {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const { language } = useLanguage();
  
  // Transform the data to match the chart format and reverse to show chronological order
  const chartData = data.map(sale => ({
    month: new Date(sale.timestamp).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', day: 'numeric' }),
    sales: sale.amount ?? sale.total_amount ?? 0,
    table: sale.table,
    itemCount: sale.itemCount ?? sale.item_count ?? 0
  })).reverse();

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <AreaChart accessibilityLayer data={chartData}>
        <defs>
          <linearGradient id="recentSalesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-sales)" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="var(--color-sales)" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value}
        />
        <YAxis 
          tickFormatter={(value) => formatCurrency(value, settings.defaultCurrency)}
          tickLine={false}
          axisLine={false}
          tickMargin={10}
        />
        <ChartTooltip 
          cursor={false}
          content={<ChartTooltipContent 
            indicator="line"
            labelClassName="text-sm"
            className="bg-card border-border"
            formatter={(value: any) => [formatCurrency(value, settings.defaultCurrency)]}
            labelFormatter={(label: any, payload: any) => {
              if (payload && payload[0]) {
                const data = payload[0].payload;
                return `${data.table} - ${data.itemCount} ${t('dashboard.items')}`;
              }
              return label;
            }}
          />} 
        />
        <Area 
          dataKey="sales" 
          type="monotone" 
          fill="url(#recentSalesGradient)" 
          stroke="var(--color-sales)" 
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}
