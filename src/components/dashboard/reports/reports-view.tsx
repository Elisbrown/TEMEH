
"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DateRange } from "react-day-picker"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, Pie, PieChart, Cell } from "recharts"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/dashboard/reports/date-range-picker"
import { Download } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { exportSalesSummaryToPDF } from "@/lib/pdf-export"
import { useAuth } from "@/context/auth-context"
import { useTranslation } from "@/hooks/use-translation"
import { useSettings } from "@/context/settings-context"


const salesOverTimeData = [
  { date: "2023-01-01", sales: 200000 },
  { date: "2023-01-02", sales: 250000 },
  { date: "2023-01-03", sales: 180000 },
  { date: "2023-01-04", sales: 320000 },
  { date: "2023-01-05", sales: 280000 },
  { date: "2023-01-06", sales: 450000 },
  { date: "2023-01-07", sales: 400000 },
]

const salesByCategoryData = [
  { name: "Cocktails", value: 400, color: "hsl(var(--chart-1))" },
  { name: "Snacks", value: 300, color: "hsl(var(--chart-2))" },
  { name: "Beer", value: 200, color: "hsl(var(--chart-3))" },
  { name: "Wine", value: 278, color: "hsl(var(--chart-4))" },
  { name: "Soft Drinks", value: 189, color: "hsl(var(--chart-5))" },
]

const recentTransactionsData = [
  { id: "TRX001", date: "2023-10-26", amount: 15000, table: "VIP 1", cashier: "Cashier User" },
  { id: "TRX002", date: "2023-10-26", amount: 8500, table: "Lounge 2", cashier: "Cashier User" },
  { id: "TRX003", date: "2023-10-26", amount: 22000, table: "Patio 1", cashier: "Manager User" },
  { id: "TRX004", date: "2023-10-25", amount: 5000, table: "Bar 2", cashier: "Cashier User" },
  { id: "TRX005", date: "2023-10-25", amount: 12500, table: "Lounge 1", cashier: "Cashier User" },
]

const salesChartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export function ReportsView() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { settings } = useSettings()

  const [isGenerating, setIsGenerating] = React.useState(false)
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date()
  })
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  const fetchData = React.useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    setLoading(true)
    try {
      const from = dateRange.from.toISOString();
      const to = dateRange.to.toISOString();
      const response = await fetch(`/api/dashboard-stats?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleGenerateReport = async () => {
    if (!data) return;
    setIsGenerating(true)
    
    await exportSalesSummaryToPDF(data, t('reports.salesReports'), user ? { name: user.name, email: user.email } : undefined, settings)
    
    setIsGenerating(false)
  }

  const handleExportReport = () => {
    if (!data?.chartData?.sales) return;
    
    const csvContent = "data:text/csv;charset=utf-8,Date,Sales\n" + 
      data.chartData.sales.map((row: any) => `${row.label},${row.current}`).join('\n')
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `sales_report_${new Date().toISOString()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const salesOverTimeData = data?.chartData?.sales?.map((d: any) => ({
    date: d.label,
    sales: d.current
  })) || []

  const salesByCategoryData = data?.categorySales?.map((c: any) => ({
    name: c.category,
    value: c.sales,
    color: c.color
  })) || []

  const staffPerformance = data?.staffPerformance || []
  const recentTransactionsData = data?.recentSales || []


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-headline">{t('reports.salesReports')}</h2>
          <p className="text-muted-foreground">
            {t('reports.description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
            <DateRangePicker onDateRangeChange={setDateRange} />
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1"
              onClick={handleGenerateReport}
              disabled={isGenerating}
            >
                {isGenerating ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {t('reports.generating')}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    {t('reports.generateReport')}
                  </>
                )}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1"
              onClick={handleExportReport}
            >
                <Download className="h-4 w-4" />
                {t('reports.export')}
            </Button>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">{t('reports.salesOverTime')}</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={salesChartConfig} className="min-h-[300px] w-full">
              <AreaChart
                accessibilityLayer
                data={salesOverTimeData}
                margin={{
                  left: 12,
                  right: 12,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Area
                  dataKey="sales"
                  type="natural"
                  fill="var(--color-sales)"
                  fillOpacity={0.4}
                  stroke="var(--color-sales)"
                  stackId="a"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">{t('reports.salesByCategory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="mx-auto aspect-square max-h-[300px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie data={salesByCategoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                     {salesByCategoryData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      
       <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">{t('reports.staffPerformance')}</CardTitle>
                    <CardDescription>{t('reports.staffPerformanceDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('staff.name')}</TableHead>
                                <TableHead>{t('staff.role')}</TableHead>
                                <TableHead className="text-right">{t('reports.totalSalesValue')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staffPerformance.map((staff: any) => (
                                <TableRow key={staff.email}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={staff.avatar} alt={staff.name} />
                                                <AvatarFallback>{staff.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="font-medium">{staff.name}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{staff.role}</TableCell>
                                    <TableCell className="text-right">XAF {staff.total_revenue.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">{t('reports.recentTransactions')}</CardTitle>
                    <CardDescription>{t('reports.recentTransactionsDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>{t('orders.orderId')}</TableHead>
                        <TableHead>{t('orders.table')}</TableHead>
                        <TableHead>{t('reports.cashier')}</TableHead>
                        <TableHead className="text-right">{t('reports.amount')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentTransactionsData.map((trx: any) => (
                        <TableRow key={trx.id}>
                            <TableCell className="font-medium">{trx.id}</TableCell>
                            <TableCell>{trx.table}</TableCell>
                            <TableCell>{trx.cashier || 'System'}</TableCell>
                            <TableCell className="text-right">XAF {trx.total_amount.toLocaleString()}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>
       </div>
    </div>
  )
}
