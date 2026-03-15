import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'

// Type definitions for database query results
interface StockMovementRow {
    month: string
    year: string
    movement_type: string
    quantity: number
}

interface CategoryRow {
    category: string
    item_count: number
    total_value: number
}

interface ActivityRow {
    id: number
    movement_type: string
    quantity: number
    movement_date: string
    notes: string | null
    item_name: string
    item_sku: string
    user_name: string | null
}

interface LowStockRow {
    id: number
    name: string
    sku: string
    current_stock: number
    min_stock_level: number
    category: string
}

function getDb(): Database.Database {
    const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db')
    return new Database(dbPath)
}

export async function GET() {
    try {
        const db = getDb()

        // Get current month and previous month for comparisons
        const now = new Date()
        const currentMonth = now.getMonth() + 1
        const currentYear = now.getFullYear()

        // Get stock movements for the last 6 months
        const stockMovements = db.prepare(`
            SELECT 
                strftime('%m', m.movement_date) as month,
                strftime('%Y', m.movement_date) as year,
                m.movement_type,
                COALESCE(SUM(m.quantity), 0) as quantity
            FROM inventory_movements m
            WHERE m.movement_date >= date('now', '-6 months')
            GROUP BY strftime('%Y-%m', m.movement_date), m.movement_type
            ORDER BY year, month
        `).all() as StockMovementRow[]

        // Get category distribution
        const categoryDistribution = db.prepare(`
            SELECT 
                i.category,
                COUNT(*) as item_count,
                COALESCE(SUM(i.current_stock * COALESCE(i.cost_per_unit, 0)), 0) as total_value
            FROM inventory_items i
            GROUP BY i.category
            ORDER BY total_value DESC
        `).all() as CategoryRow[]

        // Get recent activities (last 10 movements)
        const recentActivities = db.prepare(`
            SELECT 
                m.id,
                m.movement_type,
                m.quantity,
                m.movement_date,
                m.notes,
                i.name as item_name,
                i.sku as item_sku,
                u.name as user_name
            FROM inventory_movements m
            LEFT JOIN inventory_items i ON m.item_id = i.id
            LEFT JOIN users u ON m.user_id = u.id
            ORDER BY m.movement_date DESC
            LIMIT 10
        `).all() as ActivityRow[]

        // Get low stock alerts
        const lowStockAlerts = db.prepare(`
            SELECT 
                i.id,
                i.name,
                i.sku,
                i.current_stock,
                i.min_stock_level,
                i.category
            FROM inventory_items i
            WHERE i.current_stock < i.min_stock_level
            ORDER BY (i.min_stock_level - i.current_stock) DESC
            LIMIT 5
        `).all() as LowStockRow[]

        // Prepare chart data
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

        const chartData = monthNames.slice(-6).map((month, index) => {
            const monthNum = (now.getMonth() - 5 + index + 12) % 12 + 1
            const year = now.getMonth() - 5 + index < 0 ? now.getFullYear() - 1 : now.getFullYear()

            const stockIn = stockMovements.find(m =>
                parseInt(m.month) === monthNum &&
                parseInt(m.year) === year &&
                m.movement_type === 'IN'
            )?.quantity || 0

            const stockOut = stockMovements.find(m =>
                parseInt(m.month) === monthNum &&
                parseInt(m.year) === year &&
                m.movement_type === 'OUT'
            )?.quantity || 0

            const waste = stockMovements.find(m =>
                parseInt(m.month) === monthNum &&
                parseInt(m.year) === year &&
                m.movement_type === 'WASTE'
            )?.quantity || 0

            return {
                month,
                stockIn: Math.round(stockIn),
                stockOut: Math.round(stockOut),
                waste: Math.round(waste)
            }
        })

        // Prepare category data for bar chart
        const totalCategoryValue = categoryDistribution.reduce((sum, c) => sum + c.total_value, 0)
        const categoryData = categoryDistribution.map(cat => ({
            category: cat.category,
            value: totalCategoryValue > 0 ? Math.round((cat.total_value / totalCategoryValue) * 100) : 0,
            color: "hsl(var(--chart-1))"
        }))

        // Prepare recent activities with formatted data
        const formattedActivities = recentActivities.map(activity => {
            const activityDate = new Date(activity.movement_date)
            const timeAgo = getTimeAgo(activityDate)

            let activityText = ''
            let activityType = ''

            switch (activity.movement_type) {
                case 'IN':
                    activityText = `${activity.quantity} units of ${activity.item_name} received`
                    activityType = 'stockReceived'
                    break
                case 'OUT':
                    activityText = `${activity.quantity} units of ${activity.item_name} used/sold`
                    activityType = 'stockUsed'
                    break
                case 'WASTE':
                    activityText = `${activity.quantity} units of ${activity.item_name} marked as waste`
                    activityType = 'stockWaste'
                    break
                case 'ADJUSTMENT':
                    activityText = `Stock adjustment for ${activity.item_name}: ${activity.quantity} units`
                    activityType = 'stockAdjustment'
                    break
                default:
                    activityText = `${activity.movement_type} movement for ${activity.item_name}`
                    activityType = 'stockMovement'
            }

            return {
                id: activity.id,
                type: activityType,
                text: activityText,
                timeAgo,
                movementType: activity.movement_type,
                quantity: activity.quantity,
                itemName: activity.item_name,
                user: activity.user_name
            }
        })

        // Prepare low stock alerts
        const formattedAlerts = lowStockAlerts.map(item => ({
            id: item.id,
            name: item.name,
            sku: item.sku,
            currentStock: item.current_stock,
            minStockLevel: item.min_stock_level,
            category: item.category,
            shortfall: item.min_stock_level - item.current_stock
        }))

        const dashboardData = {
            chartData,
            categoryData,
            recentActivities: formattedActivities,
            lowStockAlerts: formattedAlerts
        }

        return NextResponse.json(dashboardData)
    } catch (error) {
        console.error('Error fetching inventory dashboard data:', error)
        return NextResponse.json(
            { error: 'Failed to fetch inventory dashboard data' },
            { status: 500 }
        )
    }
}

function getTimeAgo(date: Date): string {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
} 