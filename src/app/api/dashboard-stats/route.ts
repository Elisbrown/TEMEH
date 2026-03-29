
// src/app/api/dashboard-stats/route.ts
export const runtime = 'nodejs';

import { NextRequest } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'

function getDb(): Database.Database {
  const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db')
  return new Database(dbPath)
}

function getBusinessDayBounds(date: Date = new Date()) {
  const start = new Date(date)
  start.setHours(7, 0, 0, 0)
  
  const end = new Date(date)
  end.setHours(20, 0, 0, 0)
  
  // If current time is before 7 AM, they belong to the previous business day
  if (date.getHours() < 7) {
    start.setDate(start.getDate() - 1)
    end.setDate(end.getDate() - 1)
  }
  
  return { start, end }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const fromDate = searchParams.get('from')
  const toDate = searchParams.get('to')

  const db = getDb()

  try {
    // Get current date and yesterday
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const todayStr = today.toISOString().split('T')[0]
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // Default business day bounds for "today"
    const { start: todayBizStart, end: todayBizEnd } = getBusinessDayBounds(today);
    const todayBizStartStr = todayBizStart.toISOString();
    const todayBizEndStr = todayBizEnd.toISOString();

    // Build date filter clause
    // If fromDate/toDate are provided, we use BETWEEN ? AND ? (with time)
    // If not, we use the business day bounds for "today"
    const dateFilter = fromDate && toDate ? `AND timestamp BETWEEN ? AND ?` : `AND timestamp BETWEEN ? AND ?`;
    const dateParams = fromDate && toDate ? [fromDate, toDate] : [todayBizStartStr, todayBizEndStr];

    // Total orders (within date range if specified)
    const totalOrdersQuery = `SELECT COUNT(*) as count FROM orders WHERE 1=1 ${dateFilter}`;
    const totalOrders = (db.prepare(totalOrdersQuery).get(...dateParams) as { count: number }).count;

    // Completed orders (within date range)
    const completedOrdersQuery = `SELECT COUNT(*) as count FROM orders WHERE status = 'Completed' ${dateFilter}`;
    const completedOrders = (db.prepare(completedOrdersQuery).get(...dateParams) as { count: number }).count;

    // Canceled orders (within date range)
    const canceledOrdersQuery = `SELECT COUNT(*) as count FROM orders WHERE status = 'Canceled' ${dateFilter}`;
    const canceledOrders = (db.prepare(canceledOrdersQuery).get(...dateParams) as { count: number }).count;

    // Pending orders (within date range)
    const pendingOrdersQuery = `SELECT COUNT(*) as count FROM orders WHERE status IN ('Pending', 'In Progress') ${dateFilter}`;
    const pendingOrders = (db.prepare(pendingOrdersQuery).get(...dateParams) as { count: number }).count;

    // Suspended orders (held carts)
    const suspendedOrdersQuery = `SELECT COUNT(*) as count FROM held_carts`;
    const suspendedOrders = (db.prepare(suspendedOrdersQuery).get() as { count: number }).count || 0;

    // Total revenue - using new total column (within date range)
    // Total Sales (Income from orders) - previously called totalRevenue
    const totalSalesQuery = `
      SELECT COALESCE(SUM(total), 0) as total
      FROM orders
      WHERE status = 'Completed' ${dateFilter}
    `;
    const totalSales = (db.prepare(totalSalesQuery).get(...dateParams) as { total: number }).total || 0;

    // Cost Price Calculation (for Profit)
    const totalCostPriceQuery = `
      SELECT COALESCE(SUM(oi.quantity * COALESCE(i.cost_per_unit, 0)), 0) as total
      FROM order_items oi
      LEFT JOIN inventory_items i ON CAST(oi.product_id AS INTEGER) = i.id AND oi.item_type = 'inventory_item'
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'Completed' ${dateFilter.replace('timestamp', 'o.timestamp')}
    `;
    const totalCostPrice = (db.prepare(totalCostPriceQuery).get(...dateParams) as { total: number }).total || 0;

    // Total Expenses (from expenses table)
    const expensesDateFilter = `AND DATE(date) BETWEEN DATE(?) AND DATE(?)`;
    const totalExpensesQuery = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE 1=1 ${expensesDateFilter}
    `;
    const totalExpenses = (db.prepare(totalExpensesQuery).get(...dateParams) as { total: number }).total || 0;

    // Total Revenue (Sales - Expenses)
    const totalRevenue = totalSales - totalExpenses;
    
    // Daily Profit (Sales - CostPrice - Expenses)
    const dailyProfit = totalSales - (totalCostPrice + totalExpenses);

    // "Daily" metrics should reflect the current selected period vs previous equivalent period
    // If no period specified, it defaults to Today
    const dailySales = totalSales;
    const dailyExpenses = totalExpenses;
    const dailyRevenue = totalRevenue;

    // For comparison, we need the previous period of the same duration
    let prevTotalSales = 0;
    let prevTotalExpenses = 0;

    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      const duration = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - duration - 86400000); // 1 day gap or just shift
      const prevEnd = new Date(start.getTime() - 86400000);

      const prevParams = [prevStart.toISOString(), prevEnd.toISOString()];

      prevTotalSales = (db.prepare(`
        SELECT COALESCE(SUM(total), 0) as total
        FROM orders
        WHERE status = 'Completed' AND timestamp BETWEEN ? AND ?
      `).get(...prevParams) as { total: number }).total || 0;

      prevTotalExpenses = (db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE date BETWEEN ? AND ?
      `).get(...prevParams) as { total: number }).total || 0;
    } else {
      // Default comparison for "Today" is "Yesterday's Business Day"
      const yesterdayStart = new Date(todayBizStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      
      const yesterdayEnd = new Date(todayBizEnd);
      yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

      const prevParams = [yesterdayStart.toISOString(), yesterdayEnd.toISOString()];

      prevTotalSales = (db.prepare(`
        SELECT COALESCE(SUM(total), 0) as total
        FROM orders
        WHERE status = 'Completed' AND timestamp BETWEEN ? AND ?
      `).get(...prevParams) as { total: number }).total || 0;

      prevTotalExpenses = (db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE date BETWEEN ? AND ?
      `).get(...prevParams) as { total: number }).total || 0;
    }

    const prevTotalRevenue = prevTotalSales - prevTotalExpenses;

    // Calculate changes
    const salesChange = prevTotalSales > 0 ? ((totalSales - prevTotalSales) / prevTotalSales) * 100 : 0;
    const expensesChange = prevTotalExpenses > 0 ? ((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100 : 0;
    const revenueChange = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0;

    // Total Orders in period
    const periodOrders = totalOrders;
    
    let prevPeriodOrders = 0;
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      const duration = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - duration - 86400000);
      const prevEnd = new Date(start.getTime() - 86400000);
      prevPeriodOrders = (db.prepare(`SELECT COUNT(*) as count FROM orders WHERE status = 'Completed' AND timestamp BETWEEN ? AND ?`)
        .get(prevStart.toISOString(), prevEnd.toISOString()) as { count: number }).count;
    } else {
      const yesterdayStart = new Date(todayBizStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const yesterdayEnd = new Date(todayBizEnd);
      yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
      prevPeriodOrders = (db.prepare(`SELECT COUNT(*) as count FROM orders WHERE status = 'Completed' AND timestamp BETWEEN ? AND ?`)
        .get(yesterdayStart.toISOString(), yesterdayEnd.toISOString()) as { count: number }).count;
    }

    const ordersChange = prevPeriodOrders > 0 ? ((periodOrders - prevPeriodOrders) / prevPeriodOrders) * 100 : 0;


    // This week vs last week comparison
    const thisWeekStart = new Date(today)
    thisWeekStart.setDate(today.getDate() - today.getDay()) // Start of this week (Sunday)
    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    const lastWeekEnd = new Date(thisWeekStart)
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1)

    const thisWeekSales = (db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
      FROM orders WHERE status = 'Completed' 
      AND DATE(timestamp) >= ?
    `).get(thisWeekStart.toISOString().split('T')[0]) as { total: number, count: number });

    const thisWeekExpenses = (db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses WHERE DATE(date) >= ?
    `).get(thisWeekStart.toISOString().split('T')[0]) as { total: number }).total || 0;

    const lastWeekSales = (db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
      FROM orders WHERE status = 'Completed' 
      AND DATE(timestamp) BETWEEN ? AND ?
    `).get(lastWeekStart.toISOString().split('T')[0], lastWeekEnd.toISOString().split('T')[0]) as { total: number, count: number });

    const lastWeekExpenses = (db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses WHERE DATE(date) BETWEEN ? AND ?
    `).get(lastWeekStart.toISOString().split('T')[0], lastWeekEnd.toISOString().split('T')[0]) as { total: number }).total || 0;

    const thisWeekRevenue = (thisWeekSales.total || 0) - thisWeekExpenses;
    const lastWeekRevenue = (lastWeekSales.total || 0) - lastWeekExpenses;

    // This month vs last month comparison
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const thisMonthSales = (db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
      FROM orders WHERE status = 'Completed'
      AND DATE(timestamp) >= ?
    `).get(thisMonthStart.toISOString().split('T')[0]) as { total: number, count: number });

    const thisMonthExpenses = (db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses WHERE DATE(date) >= ?
    `).get(thisMonthStart.toISOString().split('T')[0]) as { total: number }).total || 0;

    const lastMonthSales = (db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
      FROM orders WHERE status = 'Completed'
      AND DATE(timestamp) BETWEEN ? AND ?
    `).get(lastMonthStart.toISOString().split('T')[0], lastMonthEnd.toISOString().split('T')[0]) as { total: number, count: number });

    const lastMonthExpenses = (db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses WHERE DATE(date) BETWEEN ? AND ?
    `).get(lastMonthStart.toISOString().split('T')[0], lastMonthEnd.toISOString().split('T')[0]) as { total: number }).total || 0;

    const thisMonthRevenue = (thisMonthSales.total || 0) - thisMonthExpenses;
    const lastMonthRevenue = (lastMonthSales.total || 0) - lastMonthExpenses;

    // Build comparison object
    const comparisons = {
      today_vs_yesterday: {
        revenue: dailyRevenue - prevTotalRevenue,
        orders: periodOrders - prevPeriodOrders,
        percentChange: revenueChange
      },
      this_week_vs_last_week: {
        revenue: thisWeekRevenue - lastWeekRevenue,
        orders: (thisWeekSales.count || 0) - (lastWeekSales.count || 0),
        percentChange: lastWeekRevenue > 0
          ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
          : 0
      },
      this_month_vs_last_month: {
        revenue: thisMonthRevenue - lastMonthRevenue,
        orders: (thisMonthSales.count || 0) - (lastMonthSales.count || 0),
        percentChange: lastMonthRevenue > 0
          ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
          : 0
      }
    };


    // Active tables
    const activeTablesStmt = db.prepare("SELECT COUNT(*) as count FROM tables WHERE status = 'Occupied'")
    const totalTablesStmt = db.prepare('SELECT COUNT(*) as count FROM tables')
    const activeTables = (activeTablesStmt.get() as { count: number }).count
    const totalTables = (totalTablesStmt.get() as { count: number }).count

    // Recent sales - within date range if specified
    const recentSalesQuery = `
      SELECT 
        o.id,
        o.table_name as "table",
        o.timestamp,
        o.total as total_amount,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.status = 'Completed' ${dateFilter.replace('timestamp', 'o.timestamp')}
      GROUP BY o.id
      ORDER BY o.timestamp DESC
      LIMIT 10
    `;
    const recentSales = db.prepare(recentSalesQuery).all(...dateParams);

    // Top selling products - within date range if specified
    const topProductsQuery = `
      SELECT 
        p.id,
        p.name,
        p.category,
        p.image,
        COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.quantity ELSE 0 END), 0) as total_sold,
        COALESCE(SUM(CASE WHEN o.id IS NOT NULL THEN oi.quantity * oi.price ELSE 0 END), 0) as total_revenue
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'Completed' ${dateFilter ? dateFilter.replace('timestamp', 'o.timestamp') : ''}
      GROUP BY p.id
      HAVING total_sold > 0
      ORDER BY total_sold DESC
      LIMIT 5
    `;
    const topSellingProducts = db.prepare(topProductsQuery).all(...dateParams);

    // Staff performance data (mock for now)


    // Inventory stats
    const totalItemsStmt = db.prepare('SELECT COUNT(*) as count FROM inventory_items')
    const totalItems = (totalItemsStmt.get() as { count: number }).count || 0

    const lowStockInventoryStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM inventory_items 
      WHERE current_stock > 0 AND current_stock <= min_stock_level
    `)
    const lowStockProductsStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE quantity > 0 AND quantity <= 10
    `)
    const lowStockItems = ((lowStockInventoryStmt.get() as { count: number }).count || 0) +
      ((lowStockProductsStmt.get() as { count: number }).count || 0)

    const outOfStockInventoryStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM inventory_items 
      WHERE current_stock <= 0
    `)
    const outOfStockProductsStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE quantity <= 0
    `)
    const outOfStockItems = ((outOfStockInventoryStmt.get() as { count: number }).count || 0) +
      ((outOfStockProductsStmt.get() as { count: number }).count || 0)

    const totalValueStmt = db.prepare(`
      SELECT COALESCE(SUM(current_stock * COALESCE(cost_per_unit, 0)), 0) as total
      FROM inventory_items
    `)
    const totalValue = (totalValueStmt.get() as { total: number }).total || 0

    const recentMovementsStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM inventory_movements 
      WHERE DATE(movement_date) = ?
    `)
    const recentMovements = (recentMovementsStmt.get(todayStr) as { count: number }).count || 0

    const chartColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))']

    // Category sales data for analytics - include ALL categories
    const categoriesListStmt = db.prepare('SELECT name FROM categories');
    const allCategories = categoriesListStmt.all() as { name: string }[];

    const categorySalesStmt = db.prepare(`
      SELECT 
        TRIM(COALESCE(p.category, i.category, 'Uncategorized')) as category_name,
        COALESCE(SUM(oi.quantity * oi.price), 0) as sales
      FROM order_items oi
      LEFT JOIN products p ON CAST(oi.product_id AS INTEGER) = p.id AND oi.item_type = 'product'
      LEFT JOIN inventory_items i ON CAST(oi.product_id AS INTEGER) = i.id AND oi.item_type = 'inventory_item'
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'Completed' ${dateFilter.replace('timestamp', 'o.timestamp')}
      GROUP BY category_name
    `)
    const categorySalesData = categorySalesStmt.all(...dateParams) as { category_name: string, sales: number }[];

    // Ensure all categories with sales are included, plus empty predefined ones
    const seenCategories = new Set(categorySalesData.map(s => (s.category_name || '').toLowerCase()));
    
    const categorySales = [
      ...categorySalesData.map((s, index) => ({
        category: s.category_name,
        sales: s.sales,
        color: chartColors[index % chartColors.length]
      })),
      ...allCategories
        .filter(cat => !seenCategories.has(cat.name.toLowerCase()))
        .map((cat, index) => ({
          category: cat.name,
          sales: 0,
          color: chartColors[(categorySalesData.length + index) % chartColors.length]
        }))
    ].sort((a, b) => b.sales - a.sales);

    // Revenue distribution data (by Product/Menu Item) - within date range
    const productSalesStmt = db.prepare(`
      SELECT 
        TRIM(COALESCE(p.name, i.name, 'Unknown Item')) as item_label,
        COALESCE(SUM(oi.quantity * oi.price), 0) as total_value
      FROM order_items oi
      LEFT JOIN products p ON CAST(oi.product_id AS INTEGER) = p.id AND oi.item_type = 'product'
      LEFT JOIN inventory_items i ON CAST(oi.product_id AS INTEGER) = i.id AND oi.item_type = 'inventory_item'
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'Completed' ${dateFilter.replace('timestamp', 'o.timestamp')}
      GROUP BY item_label
      ORDER BY total_value DESC
      LIMIT 6
    `)
    const productSalesData = productSalesStmt.all(...dateParams) as { item_label: string, total_value: number }[];

    const revenueDistribution = productSalesData.map((row, index) => ({
      label: row.item_label,
      value: row.total_value,
      color: chartColors[index % chartColors.length]
    }));

    // Staff Performance data - include all staff members who can place orders
    const waitersStmt = db.prepare(`
      SELECT id, name, email, role, avatar
      FROM users
      ORDER BY name
    `)
    const waiters = waitersStmt.all() as any[]

    // Calculate previous period for trends
    const currentFrom = new Date(fromDate || todayBizStartStr);
    const currentTo = new Date(toDate || todayBizEndStr);
    const duration = currentTo.getTime() - currentFrom.getTime();
    const prevFrom = new Date(currentFrom.getTime() - duration).toISOString();
    const prevTo = new Date(currentFrom.getTime()).toISOString(); // Use currentFrom as prevTo

    // TEAM STATS for grounding
    const teamStatsStmt = db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(SUM(total) / NULLIF(COUNT(*), 0), 0) as team_avg_order_value,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as team_completion_rate
      FROM orders
      WHERE 1=1 ${dateFilter}
    `)
    const teamStats = teamStatsStmt.get(...dateParams) as any

    const team_total_revenue = teamStats.total_revenue || 1
    const team_avg_aov = teamStats.team_avg_order_value || 0

    const staffPerformanceCalculated = waiters.map(staff => {
      // Current stats
      const currentStatsStmt = db.prepare(`
        SELECT 
          COUNT(*) as orders_processed,
          COALESCE(SUM(total), 0) as total_revenue,
          COUNT(CASE WHEN status = 'Completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as completion_rate
        FROM orders
        WHERE cashier_id = ? ${dateFilter}
      `)

      const stats = currentStatsStmt.get(staff.id, ...dateParams) as any

      // Previous stats for trend
      const prevStatsStmt = db.prepare(`
        SELECT 
          COALESCE(SUM(total), 0) as total_revenue,
          COUNT(*) as orders_processed
        FROM orders
        WHERE cashier_id = ? AND timestamp BETWEEN ? AND ?
      `)
      const prevStats = prevStatsStmt.get(staff.id, prevFrom, prevTo) as any

      const orders_processed = stats.orders_processed || 0
      const total_revenue = stats.total_revenue || 0
      const average_order_value = orders_processed > 0 ? Math.round(total_revenue / orders_processed) : 0
      const completion_rate = Math.round(stats.completion_rate || 0)

      const revenue_share = Math.round((total_revenue / team_total_revenue) * 100)
      const aov_comparison = team_avg_aov > 0 ? Math.round(((average_order_value - team_avg_aov) / team_avg_aov) * 100) : 0

      // Calculate trend based on revenue
      const prevRevenue = prevStats.total_revenue || 0
      const trend = prevRevenue > 0 ? Math.round(((total_revenue - prevRevenue) / prevRevenue) * 100 * 10) / 10 : 0

      // Performance Score: Based on 3 concrete pillars:
      // 1. Contribution (Revenue vs team): up to 40 pts
      // 2. Efficiency (AOV vs team): up to 30 pts
      // 3. Reliability (Completion Rate): up to 30 pts
      const contributionScore = Math.min(40, (total_revenue / (team_total_revenue / (waiters.length || 1))) * 20)
      const efficiencyScore = Math.min(30, (average_order_value / (team_avg_aov || 1)) * 15)
      const reliabilityScore = (completion_rate / 100) * 30

      const performance_score = Math.min(100, Math.round(contributionScore + efficiencyScore + reliabilityScore))

      // Insight generation
      let status_label = 'Stable'
      if (performance_score >= 90) status_label = 'Elite Performer'
      else if (aov_comparison > 20) status_label = 'Upsell Pro'
      else if (orders_processed > (teamStats.total_orders / waiters.length) * 1.5) status_label = 'High Volume'
      else if (completion_rate < 80 && orders_processed > 0) status_label = 'Needs Support'

      return {
        ...staff,
        id: staff.id.toString(),
        orders_processed,
        total_revenue,
        average_order_value,
        completion_rate,
        revenue_share,
        aov_comparison,
        performance_score,
        trend,
        status_label,
        hours_worked: orders_processed * 0.5 // Keep as mock for now
      }
    })

    const staffPerformance = staffPerformanceCalculated
      .sort((a: any, b: any) => b.performance_score - a.performance_score)
      .map((staff: any, index: number) => ({
        ...staff,
        rank: index + 1
      }))

    // Prepare chart data
    const chartData = {
      sales: [] as any[],
      revenue: [] as any[],
      expenses: [] as any[]
    };

    const startDate = fromDate ? new Date(fromDate) : todayBizStart;
    const endDate = toDate ? new Date(toDate) : todayBizEnd;

    // Check if start and end date are the same day (or very close)
    // We check if the duration is less than or equal to 26 hours (allowing for some buffer)
    // This handles "Today" (00:00 to Now) and "Yesterday" (00:00 to 23:59) correctly regardless of timezone shifts in UTC
    const durationMs = endDate.getTime() - startDate.getTime();
    const isSingleDay = durationMs <= 26 * 60 * 60 * 1000;

    if (isSingleDay) {
      // HOURLY MODE: Rolling 24h or fixed day
      const previousStartDate = new Date(startDate.getTime() - durationMs);
      const previousEndDate = new Date(endDate.getTime() - durationMs);

      const currentOrders = db.prepare(`
        SELECT timestamp, total as amount, 'current' as period
        FROM orders
        WHERE timestamp BETWEEN ? AND ? AND status = 'Completed'
      `).all(startDate.toISOString(), endDate.toISOString()) as any[];

      const previousOrders = db.prepare(`
        SELECT timestamp, total as amount, 'previous' as period
        FROM orders
        WHERE timestamp BETWEEN ? AND ? AND status = 'Completed'
      `).all(previousStartDate.toISOString(), previousEndDate.toISOString()) as any[];

      const currentExpenses = db.prepare(`
        SELECT date as timestamp, amount as amount, 'current' as period
        FROM expenses
        WHERE date BETWEEN ? AND ?
      `).all(startDate.toISOString(), endDate.toISOString()) as any[];

      const previousExpenses = db.prepare(`
        SELECT date as timestamp, amount as amount, 'previous' as period
        FROM expenses
        WHERE date BETWEEN ? AND ?
      `).all(previousStartDate.toISOString(), previousEndDate.toISOString()) as any[];

      // Generate 24 hourly buckets
      for (let i = 0; i < 24; i++) {
        const bucketStart = new Date(startDate.getTime() + i * 3600000);
        const bucketEnd = new Date(bucketStart.getTime() + 3600000);
        const label = `${bucketStart.getHours().toString().padStart(2, '0')}:00`;

        // Bucket current data - count orders for 'sales' (Total Orders)
        const currOrdersInBucket = currentOrders.filter(o => {
          const d = new Date(o.timestamp);
          return d >= bucketStart && d < bucketEnd;
        });
        const currOrderCount = currOrdersInBucket.length;
        const currSalesAmount = currOrdersInBucket.reduce((sum, o) => sum + o.amount, 0);

        const currExpenses = currentExpenses
          .filter(e => {
            const d = new Date(e.timestamp);
            return d >= bucketStart && d < bucketEnd;
          })
          .reduce((sum, e) => sum + e.amount, 0);

        // Bucket previous data (corresponding hour in previous period)
        const prevBucketStart = new Date(bucketStart.getTime() - durationMs);
        const prevBucketEnd = new Date(bucketEnd.getTime() - durationMs);

        const prevOrdersInBucket = previousOrders.filter(o => {
          const d = new Date(o.timestamp);
          return d >= prevBucketStart && d < prevBucketEnd;
        });
        const prevOrderCount = prevOrdersInBucket.length;
        const prevSalesAmount = prevOrdersInBucket.reduce((sum, o) => sum + o.amount, 0);

        const prevExpenses = previousExpenses
          .filter(e => {
            const d = new Date(e.timestamp);
            return d >= prevBucketStart && d < prevBucketEnd;
          })
          .reduce((sum, e) => sum + e.amount, 0);

        const currRevenue = currSalesAmount - currExpenses;
        const prevRevenue = prevSalesAmount - prevExpenses;

        // sales = order counts (for Total Orders tab), revenue = revenue amounts (for Total Revenue tab)
        chartData.sales.push({ label, current: currOrderCount, previous: prevOrderCount });
        chartData.revenue.push({ label, current: currSalesAmount, previous: prevSalesAmount });
        chartData.expenses.push({ label, current: currExpenses, previous: prevExpenses });
      }
    } else {
      // DAILY MODE: Compare Current Range vs Previous Range
      const duration = endDate.getTime() - startDate.getTime();
      const previousStartDate = new Date(startDate.getTime() - duration - 86400000); // Shift back by duration + 1 day
      const previousEndDate = new Date(startDate.getTime() - 86400000); // Shift back by 1 day

      // Helper to get date range array
      const getDaysArray = (start: Date, end: Date) => {
        for (var arr = [], dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
          arr.push(new Date(dt));
        }
        return arr;
      };

      const currentDateList = getDaysArray(new Date(startDate), new Date(endDate));

      const currentOrdersDaily = db.prepare(`
        SELECT DATE(timestamp) as date, COUNT(*) as count, SUM(total) as total
        FROM orders
        WHERE DATE(timestamp) BETWEEN ? AND ? AND status = 'Completed'
        GROUP BY date
      `).all(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]) as { date: string, count: number, total: number }[];

      const currentExpensesDaily = db.prepare(`
        SELECT DATE(date) as date, SUM(amount) as total
        FROM expenses
        WHERE DATE(date) BETWEEN ? AND ?
        GROUP BY date
      `).all(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]) as { date: string, total: number }[];

      const previousOrdersDaily = db.prepare(`
        SELECT DATE(timestamp) as date, COUNT(*) as count, SUM(total) as total
        FROM orders
        WHERE DATE(timestamp) BETWEEN ? AND ? AND status = 'Completed'
        GROUP BY date
      `).all(previousStartDate.toISOString().split('T')[0], previousEndDate.toISOString().split('T')[0]) as { date: string, count: number, total: number }[];

      const previousExpensesDaily = db.prepare(`
        SELECT DATE(date) as date, SUM(amount) as total
        FROM expenses
        WHERE DATE(date) BETWEEN ? AND ?
        GROUP BY date
      `).all(previousStartDate.toISOString().split('T')[0], previousEndDate.toISOString().split('T')[0]) as { date: string, total: number }[];

      // Map data
      currentDateList.forEach((date, index) => {
        const dateStr = date.toISOString().split('T')[0];

        // Calculate previous date corresponding to this index
        const prevDate = new Date(previousStartDate);
        prevDate.setDate(prevDate.getDate() + index);
        const prevDateStr = prevDate.toISOString().split('T')[0];

        const currOrderCount = currentOrdersDaily.find(d => d.date === dateStr)?.count || 0;
        const currSalesAmount = currentOrdersDaily.find(d => d.date === dateStr)?.total || 0;
        const prevOrderCount = previousOrdersDaily.find(d => d.date === prevDateStr)?.count || 0;
        const prevSalesAmount = previousOrdersDaily.find(d => d.date === prevDateStr)?.total || 0;

        const currExpenses = currentExpensesDaily.find(d => d.date === dateStr)?.total || 0;
        const prevExpenses = previousExpensesDaily.find(d => d.date === prevDateStr)?.total || 0;

        const currRevenue = currSalesAmount - currExpenses;
        const prevRevenue = prevSalesAmount - prevExpenses;

        // sales = order counts (for Total Orders tab), revenue = revenue amounts (for Total Revenue tab)
        chartData.sales.push({ label: dateStr, current: currOrderCount, previous: prevOrderCount });
        chartData.revenue.push({ label: dateStr, current: currSalesAmount, previous: prevSalesAmount });
        chartData.expenses.push({ label: dateStr, current: currExpenses, previous: prevExpenses });
      });
    }

    return Response.json({
      dailyProfit,  // New field: Daily Profit
      totalRevenue, // Now equals Sales - Expenses
      totalSales,   // Income from orders
      totalCostPrice, // Cost price calculated
      totalExpenses, // Total expenses
      totalOrders,
      completedOrders,
      canceledOrders,
      pendingOrders,
      suspendedOrders,
      activeTables: `${activeTables} / ${totalTables}`,
      topSellingProducts,
      recentSales,
      dailySales,
      yesterdaySales: prevTotalSales,
      salesChange,
      ordersChange,
      revenueChange,
      dailyExpenditure: dailyExpenses,
      dailyExpenditureChange: expensesChange,
      comparisons,
      staffPerformance,
      chartData,
      inventory: {
        totalItems,
        lowStockItems,
        outOfStockItems,
        totalValue,
        recentMovements
      },
      categorySales,
      revenueDistribution,
      debug: {
        dbPath: path.resolve(process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db')),
        cwd: process.cwd()
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return Response.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  } finally {
    db.close()
  }
}
