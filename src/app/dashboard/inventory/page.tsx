
"use client"

import { useState, useEffect } from 'react'
import { Header } from '@/components/dashboard/header'
import { useAuth } from '@/context/auth-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Lock, Package, TrendingUp, AlertTriangle, DollarSign, Clock, BarChart3, BookOpen, Truck, ClipboardList } from 'lucide-react'
import { useTranslation } from '@/hooks/use-translation'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Bar, BarChart } from "recharts"
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useInventory } from '@/context/inventory-context'
import { useSettings } from '@/context/settings-context'
import { formatCurrency } from '@/lib/utils'
import { MovementsExportDialog } from '@/components/dashboard/inventory/movements-export-dialog'

const chartConfig = {
  stockIn: {
    label: "Stock In",
    color: "hsl(var(--chart-1))",
  },
  stockOut: {
    label: "Stock Out",
    color: "hsl(var(--chart-2))",
  },
  waste: {
    label: "Waste",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig

type InventoryDashboardData = {
  chartData: Array<{
    month: string
    stockIn: number
    stockOut: number
    waste: number
  }>
  categoryData: Array<{
    category: string
    value: number
    color: string
  }>
  recentActivities: Array<{
    id: number
    type: string
    text: string
    timeAgo: string
    movementType: string
    quantity: number
    itemName: string
    user: string
  }>
  lowStockAlerts: Array<{
    id: number
    name: string
    sku: string
    currentStock: number
    minStockLevel: number
    category: string
    shortfall: number
  }>
}

function InventoryDashboardContent() {
  const { t } = useTranslation()
  const { stats, loading } = useInventory()
  const { settings } = useSettings()
  const [dashboardData, setDashboardData] = useState<InventoryDashboardData | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async (isBackground = false) => {
      try {
        if (!isBackground) setDataLoading(true)
        const response = await fetch('/api/inventory/dashboard')
        if (!response.ok) {
          throw new Error('Failed to fetch inventory dashboard data')
        }
        const data = await response.json()
        setDashboardData(data)
      } catch (err) {
        if (!isBackground) setDataError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        if (!isBackground) setDataLoading(false)
      }
    }

    fetchDashboardData()
    const interval = setInterval(() => fetchDashboardData(true), 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header title={t('inventory.dashboard.title')} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('inventory.dashboard.totalItems')}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading.stats ? '...' : stats?.totalItems || 0}</div>
              <p className="text-xs text-muted-foreground">{t('inventory.dashboard.itemsInStock')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('inventory.dashboard.lowStock')}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{loading.stats ? '...' : stats?.lowStockItems || 0}</div>
              <p className="text-xs text-muted-foreground">{t('inventory.dashboard.needsRestocking')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('inventory.dashboard.outOfStock')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{loading.stats ? '...' : stats?.outOfStockItems || 0}</div>
              <p className="text-xs text-muted-foreground">{t('inventory.dashboard.urgentRestock')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('inventory.dashboard.totalValue')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading.stats ? '...' : formatCurrency(stats?.totalValue || 0, settings.defaultCurrency)}
              </div>
              <p className="text-xs text-muted-foreground">{t('inventory.dashboard.inventoryValue')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>{t('inventory.dashboard.stockMovements')}</CardTitle>
              <CardDescription>{t('inventory.dashboard.movementsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              {dataLoading ? (
                <div className="h-[300px] w-full flex items-center justify-center">
                  <div className="text-muted-foreground">Loading chart data...</div>
                </div>
              ) : dataError ? (
                <div className="h-[300px] w-full flex items-center justify-center">
                  <div className="text-muted-foreground">Error loading chart data</div>
                </div>
              ) : dashboardData ? (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <AreaChart
                    accessibilityLayer
                    data={dashboardData.chartData}
                    margin={{
                      left: 12,
                      right: 12,
                      top: 12,
                      bottom: 12,
                    }}
                  >
                    <defs>
                      <linearGradient id="stockIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="stockOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="waste" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload) {
                          return (
                            <ChartTooltipContent>
                              {payload.map((item: any, index: number) => (
                                <div key={index} className="flex items-center gap-2">
                                  <div
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                  />
                                  <span className="text-sm font-medium">
                                    {item.dataKey}: {item.value}
                                  </span>
                                </div>
                              ))}
                            </ChartTooltipContent>
                          )
                        }
                        return null
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="stockIn"
                      stroke="hsl(var(--chart-1))"
                      fill="url(#stockIn)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="stockOut"
                      stroke="hsl(var(--chart-2))"
                      fill="url(#stockOut)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="waste"
                      stroke="hsl(var(--chart-3))"
                      fill="url(#waste)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : null}
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>{t('inventory.dashboard.quickActions')}</CardTitle>
              <CardDescription>Manage your inventory</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/dashboard/inventory/items">
                <Button variant="outline" className="w-full justify-start h-auto py-4">
                  <div className="flex items-start gap-3 text-left">
                    <Package className="h-5 w-5 mt-0.5" />
                    <div>
                      <div className="font-semibold">Stock Items</div>
                      <div className="text-sm text-muted-foreground">
                        Manage inventory items, adjust stock levels, and track movements
                      </div>
                    </div>
                  </div>
                </Button>
              </Link>

              <Link href="/dashboard/inventory/suppliers">
                <Button variant="outline" className="w-full justify-start h-auto py-4">
                  <div className="flex items-start gap-3 text-left">
                    <Truck className="h-5 w-5 mt-0.5" />
                    <div>
                      <div className="font-semibold">Suppliers</div>
                      <div className="text-sm text-muted-foreground">
                        Manage supplier information and contacts
                      </div>
                    </div>
                  </div>
                </Button>
              </Link>

              <MovementsExportDialog />
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity and Alerts */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('inventory.dashboard.recentActivity')}</CardTitle>
              <CardDescription>{t('inventory.dashboard.activityDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-2 w-2 rounded-full bg-gray-300 animate-pulse"></div>
                      <div className="flex-1 space-y-1">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-32"></div>
                      </div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-12"></div>
                    </div>
                  ))}
                </div>
              ) : dataError ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">Error loading recent activities</div>
                </div>
              ) : dashboardData?.recentActivities && dashboardData.recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.recentActivities.slice(0, 3).map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-4">
                      <div className={`h-2 w-2 rounded-full ${activity.movementType === 'IN' ? 'bg-green-500' :
                          activity.movementType === 'OUT' ? 'bg-orange-500' :
                            activity.movementType === 'WASTE' ? 'bg-red-500' : 'bg-blue-500'
                        }`}></div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">
                          {activity.movementType === 'IN' ? t('inventory.dashboard.stockReceived') :
                            activity.movementType === 'OUT' ? t('inventory.dashboard.stockUsed') :
                              activity.movementType === 'WASTE' ? t('inventory.dashboard.stockWaste') :
                                t('inventory.dashboard.stockMovement')}
                        </p>
                        <p className="text-xs text-muted-foreground">{activity.text}</p>
                      </div>
                      <div className="text-xs text-muted-foreground">{activity.timeAgo}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('inventory.dashboard.noRecentActivity')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('inventory.dashboard.categoryBreakdown')}</CardTitle>
              <CardDescription>{t('inventory.dashboard.categoryDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {dataLoading ? (
                <div className="h-[200px] w-full flex items-center justify-center">
                  <div className="text-muted-foreground">Loading category data...</div>
                </div>
              ) : dataError ? (
                <div className="h-[200px] w-full flex items-center justify-center">
                  <div className="text-muted-foreground">Error loading category data</div>
                </div>
              ) : dashboardData?.categoryData && dashboardData.categoryData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                  <BarChart
                    data={dashboardData.categoryData}
                    margin={{
                      left: 12,
                      right: 12,
                      top: 12,
                      bottom: 12,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="category" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload) {
                          return (
                            <ChartTooltipContent>
                              {payload.map((item: any, index: number) => (
                                <div key={index} className="flex items-center gap-2">
                                  <div
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                  />
                                  <span className="text-sm font-medium">
                                    {item.dataKey}: {item.value}
                                  </span>
                                </div>
                              ))}
                            </ChartTooltipContent>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-[200px] w-full flex items-center justify-center">
                  <div className="text-muted-foreground">No category data available</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default function InventoryPage() {
  const { user } = useAuth()
  const { t } = useTranslation()

  const canViewPage = () => {
    if (!user) return false
    const allowedRoles = ["Manager", "Admin", "Super Admin", "Stock Manager"];
    return allowedRoles.includes(user.role)
  }

  if (!canViewPage()) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <Header title={t('inventory.dashboard.title')} />
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

  return <InventoryDashboardContent />
}
