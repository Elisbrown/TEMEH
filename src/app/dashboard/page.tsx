"use client"

import { useEffect, useState, useCallback } from 'react'
import { CreditCard, DollarSign, Users, Activity, History, XCircle, CheckCircle2, PackageSearch, TrendingUp, TrendingDown, Clock, Calendar, FileText, Receipt, BarChart3, LineChart, PieChart, Lock, Boxes } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Header } from '@/components/dashboard/header'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { RecentSales } from '@/components/dashboard/recent-sales'
import { TopProducts } from '@/components/dashboard/top-products'
import { useTranslation } from '@/hooks/use-translation'
import { Skeleton } from '@/components/ui/skeleton'
import { PageOnboarding } from '@/components/dashboard/onboarding/page-onboarding'
import { ActivityLogTable } from '@/components/dashboard/activity/activity-log-table'
import { useActivityLog } from '@/hooks/use-activity-log'
import { useSettings } from '@/context/settings-context'
import { formatCurrency } from '@/lib/utils'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'
import { DashboardCalendar } from '@/components/dashboard/dashboard-calendar'
import { DashboardNotes } from '@/components/dashboard/dashboard-notes'
import { PendingOrdersTable } from '@/components/dashboard/pending-orders-table'
import { StaffPerformanceTable } from '@/components/dashboard/staff-performance-table'
import { DateRangePicker } from '@/components/dashboard/reports/date-range-picker'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DateRange } from 'react-day-picker'
import { CategorySalesChart } from '@/components/dashboard/charts/category-sales-chart'
import { RevenueDistributionChart } from '@/components/dashboard/charts/revenue-distribution-chart'
import { useAuth } from '@/context/auth-context'

type DashboardData = {
  totalRevenue: number;
  totalSales: number;
  totalExpenses: number;
  totalOrders: number;
  completedOrders: number;
  canceledOrders: number;
  pendingOrders: number;
  suspendedOrders: number;
  activeTables: string;
  topSellingProducts: any[];
  recentSales: any[];
  dailySales: number;
  yesterdaySales: number;
  salesChange: number;
  ordersChange: number;
  revenueChange: number;
  dailyExpenditure: number;
  dailyExpenditureChange: number;
  staffPerformance: any[];
  categorySales: Array<{ category: string; sales: number; color: string }>;
  revenueDistribution: Array<{ label: string; value: number; color: string }>;
  chartData: {
    sales: Array<{ label: string; current: number; previous: number }>;
    revenue: Array<{ label: string; current: number; previous: number }>;
  };
  inventory: {
    totalItems: number;
    lowStockItems: number;
    outOfStockItems: number;
    totalValue: number;
    recentMovements: number;
  };
}

function KpiSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-3/5 mb-2" />
        <Skeleton className="h-3 w-4/5" />
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const { settings } = useSettings()
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 0, 0, 0),
    to: new Date()
  });
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [refreshInterval, setRefreshInterval] = useState(10000); // 10 seconds
  const { logs } = useActivityLog();

  const recentLogs = logs.slice(0, 5);

  // Access control - only Super Admin and Manager can view dashboard
  const canViewPage = () => {
    if (!user) return false;
    const allowedRoles = ["Manager", "Super Admin"];
    return allowedRoles.includes(user.role);
  }

  /* Removed conditional return from here to fix hook order violation */
  /* Access control checks should be done after all hooks are declared */

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);

    const now = new Date();
    let from: Date;
    let to: Date = now;

    switch (period) {
      case 'today':
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        from = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
        to = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
        break;
      case '3d':
        from = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        break;
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1m':
        from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case '3m':
        from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case '6m':
        from = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case '9m':
        from = new Date(now.getFullYear(), now.getMonth() - 9, now.getDate());
        break;
      case '12m':
        from = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
        break;
      default:
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    }

    setDateRange({ from, to });
  };

  const handleCustomDateChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setSelectedPeriod('custom');
  };

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateRange?.from) params.append('from', dateRange.from.toISOString());
      if (dateRange?.to) params.append('to', dateRange.to.toISOString());

      const response = await fetch(`/api/dashboard-stats?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
      setData({
        totalRevenue: 0,
        totalSales: 0,
        totalExpenses: 0,
        totalOrders: 0,
        completedOrders: 0,
        canceledOrders: 0,
        pendingOrders: 0,
        suspendedOrders: 0,
        activeTables: "0 / 0",
        topSellingProducts: [],
        recentSales: [],
        dailySales: 0,
        yesterdaySales: 0,
        salesChange: 0,
        ordersChange: 0,
        revenueChange: 0,
        dailyExpenditure: 0,
        dailyExpenditureChange: 0,
        staffPerformance: [],
        categorySales: [],
        revenueDistribution: [],
        chartData: {
          sales: [],
          revenue: []
        },
        inventory: {
          totalItems: 0,
          lowStockItems: 0,
          outOfStockItems: 0,
          totalValue: 0,
          recentMovements: 0
        }
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh data
  useEffect(() => {
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatChange = (change: number) => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };


  if (!canViewPage()) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <Header title={t('dashboard.title')} />
        <main className="flex flex-1 flex-col items-center justify-center p-4 md:p-8">
          <Card className="flex flex-col items-center justify-center p-10 text-center">
            <CardHeader>
              <div className="mx-auto bg-muted rounded-full p-4">
                <Lock className="h-12 w-12 text-muted-foreground" />
              </div>
              <CardTitle className="mt-4">{t('dashboard.accessDeniedTitle') || 'Access Denied'}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('dashboard.accessDeniedDescription') || 'You do not have permission to view this page. Only Managers and Administrators can access the dashboard.'}</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageOnboarding page="dashboard" />
      <Header title={t('dashboard.title')} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {/* Dashboard Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-4">
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">{t('periods.today')}</SelectItem>
                <SelectItem value="yesterday">{t('periods.yesterday')}</SelectItem>
                <SelectItem value="3d">{t('periods.last3Days')}</SelectItem>
                <SelectItem value="7d">{t('periods.last7Days')}</SelectItem>
                <SelectItem value="1m">{t('periods.lastMonth')}</SelectItem>
                <SelectItem value="3m">{t('periods.last3Months')}</SelectItem>
                <SelectItem value="6m">{t('periods.last6Months')}</SelectItem>
                <SelectItem value="9m">{t('periods.last9Months')}</SelectItem>
                <SelectItem value="12m">{t('periods.last12Months')}</SelectItem>
                <SelectItem value="custom" disabled>{t('periods.custom') || 'Custom'}</SelectItem>
              </SelectContent>
            </Select>
            <DateRangePicker onDateRangeChange={handleCustomDateChange} initialDateRange={dateRange} />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              {t('dashboard.liveData')}
            </Badge>
            <Button variant="outline" size="sm" onClick={fetchData}>
              {t('dashboard.refresh')}
            </Button>
          </div>
        </div>

        {/* Enhanced KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
          {loading || !data ? (
            <>
              {[...Array(8)].map((_, i) => <KpiSkeleton key={i} />)}
            </>
          ) : (
            <>
              <KpiCard
                title={t('dashboard.totalRevenue')}
                value={formatCurrency(data.totalRevenue, settings.defaultCurrency)}
                change={formatChange(data.revenueChange)}
                icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                trendColor={getChangeColor(data.revenueChange)}
              />
              <KpiCard
                title={t('dashboard.dailySales')}
                value={formatCurrency(data.dailySales, settings.defaultCurrency)}
                change={formatChange(data.salesChange)}
                icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                trendColor={getChangeColor(data.salesChange)}
              />
              <KpiCard
                title={t('dashboard.dailyExpenditure')}
                value={formatCurrency(data.dailyExpenditure, settings.defaultCurrency)}
                change={formatChange(data.dailyExpenditureChange)}
                icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
                trendColor={getChangeColor(data.dailyExpenditureChange)}
              />
              <KpiCard
                title={t('dashboard.outOfStock') || "Out of Stock"}
                value={data.inventory.outOfStockItems.toString()}
                change={t('dashboard.lowStockCount', { count: data.inventory.lowStockItems })}
                icon={<PackageSearch className="h-4 w-4 text-muted-foreground" />}
                variant={data.inventory.outOfStockItems > 0 ? "destructive" : "default"}
              />
              <KpiCard
                title={t('dashboard.totalOrders')}
                value={data.totalOrders.toLocaleString()}
                change={formatChange(data.ordersChange)}
                icon={<PackageSearch className="h-4 w-4 text-muted-foreground" />}
                trendColor={getChangeColor(data.ordersChange)}
              />
               <KpiCard
                title={t('dashboard.suspendedOrders') || "Suspended Orders"}
                value={data.suspendedOrders?.toLocaleString() || "0"}
                change={t('dashboard.active') || "Active"}
                icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                variant="warning"
              />
              <KpiCard
                title={t('dashboard.stockValue') || "Stock Value"}
                value={formatCurrency(data.inventory.totalValue || 0, settings.defaultCurrency)}
                change={`${data.inventory.totalItems} items`}
                icon={<Boxes className="h-4 w-4 text-muted-foreground" />}
              />
            </>
          )}
        </div>

        {/* Main Dashboard Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">{t('dashboard.overview')}</TabsTrigger>
            <TabsTrigger value="analytics">{t('dashboard.analytics')}</TabsTrigger>
            <TabsTrigger value="performance">{t('dashboard.performance')}</TabsTrigger>
            <TabsTrigger value="tools">{t('dashboard.tools')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
              {/* Charts Section - Now using visual charts from Analytics */}
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    {t('dashboard.revenueAndOrdersTrend')}
                  </CardTitle>
                  <CardDescription>
                    {t('dashboard.revenueAndOrdersTrendDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading || !data ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <DashboardCharts data={data.chartData} />
                  )}
                </CardContent>
              </Card>

              {/* Recent Sales */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">{t('dashboard.recentSales')}</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                  {loading || !data ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <RecentSales data={data.recentSales} />
                  )}
                </CardContent>
              </Card>

              {/* Pending Orders */}
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {t('dashboard.pendingOrders')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading || !data ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <PendingOrdersTable />
                  )}
                </CardContent>
              </Card>

              {/* Top Products */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">{t('dashboard.topSellingProducts')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading || !data ? (
                    <div className="space-y-8">
                      {[...Array(5)].map((_, i) => (
                        <div className="flex items-center" key={i}>
                          <Skeleton className="h-9 w-9 rounded-full" />
                          <div className="ml-4 space-y-2">
                            <Skeleton className="h-4 w-[150px]" />
                          </div>
                          <Skeleton className="ml-auto h-5 w-[80px]" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <TopProducts products={data.topSellingProducts} />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
              {/* Advanced Charts */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    {t('dashboard.salesByCategory')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading || !data ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <CategorySalesChart data={data.categorySales} />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    {t('dashboard.revenueDistribution')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading || !data ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <RevenueDistributionChart data={data.revenueDistribution} />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-4 md:gap-8">
              {/* Staff Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {t('dashboard.staffPerformance')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading || !data ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <StaffPerformanceTable data={data.staffPerformance} />
                  )}
                </CardContent>
              </Card>

              {/* Activity Logs */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline">{t('dashboard.recentActivity')}</CardTitle>
                  <CardDescription>{t('dashboard.recentActivityDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {logs.length > 0 ? (
                    <ActivityLogTable logs={recentLogs} />
                  ) : (
                    <p className="text-center text-muted-foreground p-8">{t('activity.noLogs')}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <div className="grid gap-4 md:gap-8">
              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {t('dashboard.quickNotes')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DashboardNotes />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
