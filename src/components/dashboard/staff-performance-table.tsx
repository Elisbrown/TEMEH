"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Activity, BarChart3, Calendar, CheckCircle2, Clock, DollarSign, FileText, Info, LineChart, PackageSearch, PieChart, TrendingDown, TrendingUp, Trophy, Users, XCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from '@/hooks/use-translation'
import { formatCurrency } from '@/lib/utils'
import { useSettings } from '@/context/settings-context'

type StaffPerformance = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  orders_processed: number;
  total_revenue: number;
  average_order_value: number;
  completion_rate: number;
  revenue_share: number;
  aov_comparison: number;
  status_label: string;
  trend: number;
  hours_worked: number;
  performance_score: number;
  rank: number;
};

type StaffPerformanceTableProps = {
  data: StaffPerformance[];
}

export function StaffPerformanceTable({ data }: StaffPerformanceTableProps) {
  const [sortBy, setSortBy] = useState<'performance_score' | 'orders_processed' | 'total_revenue'>('performance_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { t } = useTranslation();
  const { settings } = useSettings();

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const sortedData = [...(data || [])].sort((a, b) => {
    const aValue = a[sortBy] as number;
    const bValue = b[sortBy] as number;
    
    if (sortOrder === 'asc') {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (score >= 80) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (score >= 70) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (!data || data.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center text-muted-foreground italic">
          {t('dashboard.noStaffData')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-950/20 dark:to-background border-yellow-100 dark:border-yellow-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t('dashboard.topPerformer')}</p>
                <p className="font-bold text-lg">{data[0]?.name || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background border-blue-100 dark:border-blue-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <PackageSearch className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t('dashboard.totalOrders')}</p>
                <p className="font-bold text-lg">
                  {data.reduce((sum, staff) => sum + staff.orders_processed, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background border-green-100 dark:border-green-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t('dashboard.totalRevenue')}</p>
                <p className="font-bold text-lg">
                  {formatCurrency(
                    data.reduce((sum, staff) => sum + staff.total_revenue, 0),
                    settings.defaultCurrency
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <TooltipProvider>
      {/* Staff Performance Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">
                  <div className="flex items-center gap-1">
                    {t('dashboard.rank')}
                    <Tooltip>
                      <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground/50" /></TooltipTrigger>
                      <TooltipContent>Position based on overall score</TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
                <TableHead>{t('dashboard.staffMember')}</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('orders_processed')}
                >
                  <div className="flex items-center gap-1">
                    {t('dashboard.orders')}
                    {sortBy === 'orders_processed' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('total_revenue')}
                >
                  <div className="flex items-center gap-1">
                    {t('dashboard.revenue')}
                    {sortBy === 'total_revenue' && (sortOrder === 'asc' ? '↑' : '↓')}
                    <Tooltip>
                      <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground/50" /></TooltipTrigger>
                      <TooltipContent>Total sales revenue and share of team total</TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    {t('dashboard.efficiency')}
                    <Tooltip>
                      <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground/50" /></TooltipTrigger>
                      <TooltipContent>Average Order Value compared to team benchmark</TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    {t('dashboard.reliability')}
                    <Tooltip>
                      <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground/50" /></TooltipTrigger>
                      <TooltipContent>Percentage of successfully completed orders</TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
                <TableHead>
                   <div className="flex items-center gap-1">
                    {t('dashboard.insights')}
                    <Tooltip>
                      <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground/50" /></TooltipTrigger>
                      <TooltipContent>AI-driven categorization of performance patterns</TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort('performance_score')}
                >
                  <div className="flex items-center justify-end gap-1">
                    {t('dashboard.score')}
                    {sortBy === 'performance_score' && (sortOrder === 'asc' ? '↑' : '↓')}
                    <Tooltip>
                      <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground/50" /></TooltipTrigger>
                      <TooltipContent>Weighted score including Contribution, Efficiency, and Reliability</TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((staff) => (
                <TableRow key={staff.id} className="group transition-colors hover:bg-muted/30">
                  <TableCell>
                    <span className="text-xl font-black text-muted-foreground/50 group-hover:text-primary transition-colors">{getRankIcon(staff.rank)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-background shadow-md">
                        <AvatarImage src={staff.avatar} alt={staff.name} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">{staff.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm tracking-tight">{staff.name}</span>
                        <Badge variant="outline" className="w-fit text-[9px] h-4 py-0 font-medium bg-muted/50">
                          {['Waiter', 'Cashier', 'Bartender', 'Manager'].includes(staff.role) 
                            ? t(`dashboard.role_${staff.role.toLowerCase()}`) 
                            : staff.role}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{staff.orders_processed}</span>
                      <span className="text-[10px] text-muted-foreground">{t('dashboard.orders').toLowerCase()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">
                        {formatCurrency(staff.total_revenue, settings.defaultCurrency)}
                      </span>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                        {staff.revenue_share}% {t('dashboard.share')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">
                        {formatCurrency(staff.average_order_value, settings.defaultCurrency)}
                      </span>
                      <div className={`flex items-center gap-0.5 text-[10px] font-bold ${staff.aov_comparison >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {staff.aov_comparison >= 0 ? '+' : ''}{staff.aov_comparison}% {t('dashboard.vsAvg')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                       <span className="font-bold text-xs">{staff.completion_rate}%</span>
                       <div className="w-16 bg-muted rounded-full h-1">
                          <div 
                            className={`h-full rounded-full ${staff.completion_rate >= 90 ? 'bg-green-500' : staff.completion_rate >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${staff.completion_rate}%` }}
                          />
                       </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge 
                        variant="secondary" 
                        className={`text-[10px] py-0 px-2 font-bold border-none ${
                          staff.status_label === 'Elite Performer' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' :
                          staff.status_label === 'Upsell Pro' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
                          staff.status_label === 'High Volume' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' :
                          staff.status_label === 'Needs Support' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                          'bg-muted text-muted-foreground'
                        }`}
                      >
                        {staff.status_label}
                      </Badge>
                      {(staff.trend || 0) !== 0 && (
                        <div className={`flex items-center gap-0.5 text-[9px] font-bold px-1 ${staff.trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {staff.trend > 0 ? <TrendingUp className="h-2 w-2" /> : <TrendingDown className="h-2 w-2" />}
                          {Math.abs(staff.trend)}%
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex flex-col items-end">
                      <span className={`text-lg font-black leading-none ${
                        staff.performance_score >= 90 ? 'text-green-600 dark:text-green-400' :
                        staff.performance_score >= 80 ? 'text-blue-600 dark:text-blue-400' :
                        staff.performance_score >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {staff.performance_score}%
                      </span>
                      <div className="h-1 w-12 bg-muted rounded-full mt-1 overflow-hidden">
                        <div 
                          className={`h-full ${
                            staff.performance_score >= 90 ? 'bg-green-500' :
                            staff.performance_score >= 80 ? 'bg-blue-500' :
                            staff.performance_score >= 70 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${staff.performance_score}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card className="bg-primary/5 border-none shadow-none">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">{t('dashboard.avgPerformance')}</p>
              <p className="font-black text-lg">
                {(data.reduce((sum, staff) => sum + staff.performance_score, 0) / data.length).toFixed(1)}%
              </p>
            </div>
            <div>
               <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">{t('dashboard.teamAvgAov')}</p>
              <p className="font-black text-lg">
                {formatCurrency(
                  data.reduce((sum, staff) => sum + staff.average_order_value, 0) / data.length,
                  settings.defaultCurrency
                )}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">{t('dashboard.totalRevenue')}</p>
              <p className="font-black text-lg text-primary">
                {formatCurrency(
                  data.reduce((sum, staff) => sum + staff.total_revenue, 0),
                  settings.defaultCurrency
                )}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">{t('dashboard.activeStaff')}</p>
              <p className="font-black text-lg">
                {data.filter(s => s.orders_processed > 0).length} / {data.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </TooltipProvider>
    </div>
  );
} 