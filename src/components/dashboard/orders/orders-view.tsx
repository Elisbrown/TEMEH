"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { useOrders, type Order, type OrderStatus } from "@/context/order-context"
import { useAuth } from "@/context/auth-context"
import { useTranslation } from "@/hooks/use-translation"
import { formatDistanceToNow } from "date-fns"
import { OrderDetailsDialog } from "./order-details-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Download, ChevronLeft, ChevronRight, DollarSign, TrendingUp, Receipt } from "lucide-react"
import { format } from "date-fns"
import { cn, formatCurrency } from "@/lib/utils"
import { useSettings } from "@/context/settings-context"
import { Label } from "@/components/ui/label"
import { useStaff } from "@/context/staff-context"
import { exportOrdersToPDF } from "@/lib/pdf-export"
import { useSearchParams } from "next/navigation"

const statusOptions: (OrderStatus | "All")[] = ["All", "Pending", "In Progress", "Ready", "Completed", "Canceled"];

export function OrdersView() {
  const { orders } = useOrders()
  const { user } = useAuth()
  const { staff } = useStaff()
  const { settings } = useSettings()
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  
  const [searchTerm, setSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | "All">("All")
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null)
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);
  const [exportOpen, setExportOpen] = React.useState(false)
  const [dateRange, setDateRange] = React.useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  
  const [stats, setStats] = React.useState<{ totalSales: number, totalExpenses: number, dailyProfit: number } | null>(null);

  React.useEffect(() => {
    // Fetch stats based on date range
    const fetchStats = async () => {
      let url = '/api/dashboard-stats';
      if (dateRange.from && dateRange.to) {
        url += `?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`;
      }
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setStats({
            totalSales: data.totalSales || 0, // Income from orders
            totalExpenses: data.totalExpenses || 0,
            dailyProfit: data.dailyProfit || 0
          });
        }
      } catch (error) {
        console.error("Failed to fetch export stats", error);
      }
    };
    fetchStats();
  }, [dateRange]);

  React.useEffect(() => {
    const orderId = searchParams.get('id');
    if (orderId && orders.length > 0) {
        const order = orders.find(o => o.id === orderId);
        if (order) {
            setSelectedOrder(order);
        }
    }
  }, [orders, searchParams]);
  
  const getStatusVariant = (status: OrderStatus) => {
    switch (status) {
      case "Pending": return "destructive"
      case "In Progress": return "secondary"
      case "Ready": return "default"
      case "Completed": return "success"
      case "Canceled": return "outline"
      default: return "outline"
    }
  }

  const filteredOrders = React.useMemo(() => {
    return orders.filter(order => {
        const cashierName = order.cashierName || staff.find(s => parseInt(s.id) === order.cashier_id)?.name || '';
        const matchesSearch = searchTerm === "" || 
                              order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              cashierName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "All" || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [orders, searchTerm, staff, statusFilter])

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getFilteredExportOrders = () => {
    if (!dateRange.from || !dateRange.to) return filteredOrders;
    const fromTime = dateRange.from.getTime();
    const toTime = new Date(dateRange.to);
    toTime.setHours(23, 59, 59, 999);
    return filteredOrders.filter(order => {
      const orderTime = order.timestamp.getTime();
      return orderTime >= fromTime && orderTime <= toTime.getTime();
    });
  }

  const handleExportCSV = () => {
    const ordersToExport = getFilteredExportOrders();
    const headers = [
      "Order ID", "Item Name", "Quantity", "Cost Price", "Selling Price", "Total Price", "Profit", "Payment Method", "Salesperson", "Date/Time"
    ];
    
    const rows: string[] = [];
    
    ordersToExport.forEach(order => {
        const orderIdPart = order.id.includes('-') ? order.id.split('-').slice(1).join('-') : order.id;
        const cashierName = order.cashierName || staff.find(s => parseInt(s.id) === order.cashier_id)?.name || '—';
        const paymentMethod = order.payment_method || '—';
        const timestamp = format(new Date(order.timestamp), 'PP p');
        
        order.items.forEach(item => {
            const costPrice = item.cost_per_unit || 0;
            const sellingPrice = item.price;
            const totalPrice = sellingPrice * item.quantity;
            const totalCost = costPrice * item.quantity;
            const profit = totalPrice - totalCost;
            
            rows.push([
                `"${orderIdPart}"`,
                `"${item.name}"`,
                item.quantity,
                costPrice,
                sellingPrice,
                totalPrice,
                profit,
                `"${paymentMethod}"`,
                `"${cashierName}"`,
                `"${timestamp}"`
            ].join(","));
        });
    });

    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_items_export_${new Date().toISOString()}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    setExportOpen(false);
  }

  const handleExportPDF = () => {
    const ordersToExport = getFilteredExportOrders();
    const userInfo = user ? { name: user.name, email: user.email, address: "Douala, Cameroon", phone: "+237 600000000" } : undefined;
    const range = dateRange.from && dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined;
    exportOrdersToPDF(ordersToExport, `Sales Items Report - ${statusFilter}`, staff, userInfo, settings as any, range, stats);
    setExportOpen(false);
  }

  return (
    <>
        {stats && (
            <div className="grid gap-4 md:grid-cols-3 mb-4">
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('dashboard.totalSales') || 'Total Sales'}</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(stats.totalSales, settings.defaultCurrency)}</div>
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('dashboard.dailyExpenditure') || 'Total Expenses'}</CardTitle>
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(stats.totalExpenses, settings.defaultCurrency)}</div>
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('dashboard.totalProfit') || 'Total Profit'}</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(stats.dailyProfit, settings.defaultCurrency)}</div>
                </CardContent>
                </Card>
            </div>
        )}

        <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
                <Input
                  placeholder={t('orders.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {statusOptions.map(status => (
                            <SelectItem key={status} value={status}>
                                {t(`orders.statuses.${status.toLowerCase().replace(' ', '_')}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Popover open={exportOpen} onOpenChange={setExportOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        {t('reports.export')}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="end">
                    <div className="space-y-4">
                        <h4 className="font-medium leading-none">{t('orders.exportOptions')}</h4>
                        <div className="grid gap-2">
                             <Label>{t('orders.dateRange')}</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange?.from ? (dateRange.to ? <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</> : format(dateRange.from, "LLL dd, y")) : <span>{t('orders.pickDateRange')}</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange as any} numberOfMonths={2} />
                                </PopoverContent>
                             </Popover>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Button onClick={handleExportCSV} variant="outline" className="w-full">{t('orders.downloadCSV')}</Button>
                            <Button onClick={handleExportPDF} className="w-full">{t('orders.downloadPDF')}</Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('orders.orderId')}</TableHead>
                    <TableHead>{t('orders.placedBy')}</TableHead>
                    <TableHead>{t('orders.items')}</TableHead>
                    <TableHead>{t('orders.total')}</TableHead>
                    <TableHead>{t('orders.payment')}</TableHead>
                    <TableHead>{t('inventory.status')}</TableHead>
                    <TableHead>{t('orders.lastUpdated')}</TableHead>
                    <TableHead className="text-right">{t('inventory.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.length > 0 ? (
                    paginatedOrders.map((order) => {
                        const sub = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                        const total = sub - (order.discount || 0) + (order.tax || 0);
                        const cashierName = order.cashierName || staff.find(s => parseInt(s.id) === order.cashier_id)?.name || '—';
                        const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
                        return (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">{order.id}</TableCell>
                                <TableCell>{cashierName}</TableCell>
                                <TableCell>{itemsCount}</TableCell>
                                <TableCell>{formatCurrency(total, settings.defaultCurrency)}</TableCell>
                                <TableCell>{order.payment_method || '—'}</TableCell>
                                <TableCell><Badge variant={getStatusVariant(order.status)}>{t(`orders.statuses.${order.status.toLowerCase().replace(' ', '_')}`)}</Badge></TableCell>
                                <TableCell>{formatDistanceToNow(order.timestamp, { addSuffix: true })}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>{t('orders.viewDetails')}</Button>
                                </TableCell>
                            </TableRow>
                        )
                    })
                  ) : (
                    <TableRow><TableCell colSpan={8} className="h-24 text-center">{t('orders.noOrdersFound')}</TableCell></TableRow>
                  )}
                </TableBody>
            </Table>
        </div>
        <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</div>
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
                <Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /> {t('common.previous')}</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>{t('common.next')} <ChevronRight className="h-4 w-4" /></Button>
            </div>
        </div>
        {selectedOrder && (
            <OrderDetailsDialog order={selectedOrder} open={!!selectedOrder} onOpenChange={(isOpen) => !isOpen && setSelectedOrder(null)} />
        )}
    </>
  )
}
