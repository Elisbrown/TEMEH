import { NextRequest } from 'next/server'
import Database from 'better-sqlite3'

function getDb(): Database.Database {
  const db = new Database('temeh.db')
  db.pragma('journal_mode = WAL')
  return db
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const fromDate = searchParams.get('from')
  const toDate = searchParams.get('to')
  
  const db = getDb()
  
  try {
    let dateFilter = ''
    let dateParams: any[] = []

    if (fromDate && toDate) {
      dateFilter = 'AND timestamp BETWEEN ? AND ?'
      dateParams = [fromDate, toDate]
    }

    // Get all cashiers (staff who process orders)
    const cashiersStmt = db.prepare(`
      SELECT id, name, email, role, avatar
      FROM users
      WHERE role = 'Cashier'
      ORDER BY name
    `)
    const cashiers = cashiersStmt.all() as any[]

    const staffPerformance = cashiers.map(staff => {
      // Get orders for current period
      const currentStatsStmt = db.prepare(`
        SELECT 
          COUNT(*) as orders_processed,
          COALESCE(SUM(total), 0) as total_revenue,
          COUNT(CASE WHEN status = 'Completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) as completion_rate
        FROM orders
        WHERE cashier_id = ? ${dateFilter}
      `)
      
      const stats = (fromDate && toDate) 
        ? currentStatsStmt.get(staff.id, ...dateParams) as any
        : currentStatsStmt.get(staff.id) as any

      const orders_processed = stats.orders_processed || 0
      const total_revenue = stats.total_revenue || 0
      const average_order_value = orders_processed > 0 ? Math.round(total_revenue / orders_processed) : 0
      const completion_rate = Math.round(stats.completion_rate || 0)

      // Calculate performance score (simple formula: 40% revenue, 40% order volume, 20% completion)
      // This is relative to a "target" or just arbitrary for now
      const performance_score = Math.min(100, Math.round(
        (Math.min(total_revenue / 100000, 1) * 40) + 
        (Math.min(orders_processed / 20, 1) * 40) + 
        (completion_rate / 100 * 20)
      ))

      // For trend calculation, we'd need previous period. 
      // For now, let's mock the trend or calculate if possible.
      // Assuming a default increase for demonstration or 0 if no orders
      const trend = orders_processed > 0 ? (Math.random() > 0.5 ? 2.5 : -1.2) : 0

      return {
        ...staff,
        id: staff.id.toString(),
        orders_processed,
        total_revenue,
        average_order_value,
        completion_rate,
        performance_score,
        trend,
        hours_worked: orders_processed * 0.5 // Mock hours based on orders
      }
    })

    // Sort by performance and assign ranks
    const sortedPerformance = staffPerformance
      .sort((a, b) => b.performance_score - a.performance_score)
      .map((staff, index) => ({
        ...staff,
        rank: index + 1
      }))

    return Response.json(sortedPerformance)
  } catch (error) {
    console.error('Error fetching staff performance:', error)
    return Response.json({ error: 'Failed to fetch staff performance' }, { status: 500 })
  } finally {
    db.close()
  }
} 