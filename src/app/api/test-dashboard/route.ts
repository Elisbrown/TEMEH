import { NextRequest } from 'next/server'
import Database from 'better-sqlite3'

function getDb(): Database.Database {
  const db = new Database('temeh.db')
  db.pragma('journal_mode = WAL')
  return db
}

export async function GET() {
  const db = getDb()
  
  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: {}
    }

    // Test 1: Basic database connection
    try {
      const testStmt = db.prepare('SELECT 1 as test')
      const testResult = testStmt.get()
      results.tests.databaseConnection = {
        status: 'PASS',
        result: testResult
      }
    } catch (error) {
      results.tests.databaseConnection = {
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 2: Tables exist
    try {
      const tablesStmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table'")
      const tables = tablesStmt.all()
      results.tests.tablesExist = {
        status: 'PASS',
        tables: tables.map(t => t.name)
      }
    } catch (error) {
      results.tests.tablesExist = {
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 3: Products query
    try {
      const productsStmt = db.prepare('SELECT COUNT(*) as count FROM products')
      const productsCount = productsStmt.get().count
      results.tests.productsQuery = {
        status: 'PASS',
        count: productsCount
      }
    } catch (error) {
      results.tests.productsQuery = {
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 4: Orders query
    try {
      const ordersStmt = db.prepare('SELECT COUNT(*) as count FROM orders')
      const ordersCount = ordersStmt.get().count
      results.tests.ordersQuery = {
        status: 'PASS',
        count: ordersCount
      }
    } catch (error) {
      results.tests.ordersQuery = {
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 5: Order items query
    try {
      const orderItemsStmt = db.prepare('SELECT COUNT(*) as count FROM order_items')
      const orderItemsCount = orderItemsStmt.get().count
      results.tests.orderItemsQuery = {
        status: 'PASS',
        count: orderItemsCount
      }
    } catch (error) {
      results.tests.orderItemsQuery = {
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 6: Users/Staff query
    try {
      const usersStmt = db.prepare('SELECT COUNT(*) as count FROM users')
      const usersCount = usersStmt.get().count
      results.tests.usersQuery = {
        status: 'PASS',
        count: usersCount
      }
    } catch (error) {
      results.tests.usersQuery = {
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 7: Categories query
    try {
      const categoriesStmt = db.prepare('SELECT COUNT(*) as count FROM categories')
      const categoriesCount = categoriesStmt.get().count
      results.tests.categoriesQuery = {
        status: 'PASS',
        count: categoriesCount
      }
    } catch (error) {
      results.tests.categoriesQuery = {
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 8: Tables query
    try {
      const tablesStmt = db.prepare('SELECT COUNT(*) as count FROM tables')
      const tablesCount = tablesStmt.get().count
      results.tests.tablesQuery = {
        status: 'PASS',
        count: tablesCount
      }
    } catch (error) {
      results.tests.tablesQuery = {
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 9: Settings query
    try {
      const settingsStmt = db.prepare('SELECT COUNT(*) as count FROM settings')
      const settingsCount = settingsStmt.get().count
      results.tests.settingsQuery = {
        status: 'PASS',
        count: settingsCount
      }
    } catch (error) {
      results.tests.settingsQuery = {
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 10: Complex dashboard stats query (the one that was failing)
    try {
      const recentSalesStmt = db.prepare(`
        SELECT 
          o.id,
          o.table_name as "table",
          o.timestamp,
          COALESCE(SUM(oi.quantity * oi.price), 0) as total_amount,
          COUNT(oi.id) as item_count
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.status = 'Completed'
        GROUP BY o.id
        ORDER BY o.timestamp DESC
        LIMIT 5
      `)
      const recentSales = recentSalesStmt.all()
      results.tests.dashboardStatsQuery = {
        status: 'PASS',
        count: recentSales.length,
        sample: recentSales[0] || null
      }
    } catch (error) {
      results.tests.dashboardStatsQuery = {
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 11: Top products query
    try {
      const topProductsStmt = db.prepare(`
        SELECT 
          p.id,
          p.name,
          p.category,
          COALESCE(SUM(oi.quantity), 0) as total_sold,
          COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue
        FROM products p
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'Completed'
        GROUP BY p.id
        ORDER BY total_sold DESC
        LIMIT 3
      `)
      const topProducts = topProductsStmt.all()
      results.tests.topProductsQuery = {
        status: 'PASS',
        count: topProducts.length,
        sample: topProducts[0] || null
      }
    } catch (error) {
      results.tests.topProductsQuery = {
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test 12: Chart data query
    try {
      const chartDataStmt = db.prepare(`
        SELECT 
          DATE(o.timestamp) as date,
          COALESCE(SUM(oi.quantity * oi.price), 0) as revenue,
          COUNT(DISTINCT o.id) as orders
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.status = 'Completed'
        AND o.timestamp >= date('now', '-7 days')
        GROUP BY DATE(o.timestamp)
        ORDER BY date
      `)
      const chartData = chartDataStmt.all()
      results.tests.chartDataQuery = {
        status: 'PASS',
        count: chartData.length,
        sample: chartData[0] || null
      }
    } catch (error) {
      results.tests.chartDataQuery = {
        status: 'FAIL',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Summary
    const passedTests = Object.values(results.tests).filter((test: any) => test.status === 'PASS').length
    const totalTests = Object.keys(results.tests).length
    
    results.summary = {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      successRate: `${((passedTests / totalTests) * 100).toFixed(1)}%`
    }

    db.close()
    return Response.json(results)

  } catch (error) {
    db.close()
    return Response.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 