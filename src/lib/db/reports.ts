

import { getOrders } from './orders';
import { getStaff } from './staff';
import { getExpenses } from './expenses';
import { getPayouts } from './payroll';
import { getInventoryMovements } from './inventory';

import { getMeals } from './products';
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns';

export async function getDashboardKpis() {
    try {
        const orders = await getOrders();
        // Removed validation to tables as we are in cold store mode

        const completedOrders = orders.filter(o => o.status === 'Completed');
        const canceledOrders = orders.filter(o => o.status === 'Canceled');

        const totalRevenue = completedOrders.reduce((sum, order) => 
            sum + order.items.reduce((itemSum, item) => itemSum + item.price * item.quantity, 0), 0);
        
        // Use real expense and payout data
        const expenses = await getExpenses();
        const payouts = await getPayouts();

        const totalExpenseAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const totalPayoutAmount = payouts.reduce((sum, pay) => sum + pay.net_amount, 0);
        
        const totalSpending = totalExpenseAmount + totalPayoutAmount;
        
        const totalOrders = orders.length;
        
        // Real stock value (based on last known inventory value from movements)
        const movements = await getInventoryMovements(undefined, 100);
        const movementsWithTotalCost = movements.filter(m => m.total_cost !== undefined);
        const lastMovement = movementsWithTotalCost.length > 0 ? movementsWithTotalCost[0] : null;
        // This is a rough estimate; in a full system we'd sum (quantity * unit_cost) for all items
        // For now, let's just pass a formatted currency string if possible, or "0"
        
        return {
            totalRevenue: totalRevenue,
            totalSpending: totalSpending,
            totalOrders: totalOrders,
            completedOrders: completedOrders.length,
            canceledOrders: canceledOrders.length,
            activeTables: "0", // Keeping as string for UI compatibility
        }
    } catch (error) {
        console.error("Error fetching dashboard KPIs:", error);
        return {
            totalRevenue: 0,
            totalSpending: 0,
            totalOrders: 0,
            completedOrders: 0,
            canceledOrders: 0,
            activeTables: "0",
        }
    }
}


export async function getTopSellingProducts() {
    try {
        const orders = await getOrders();
        const meals = await getMeals();

        const productSales: { [key: string]: { name: string, sales: number, avatar: string, dataAiHint: string } } = {};

        orders.filter(o => o.status === 'Completed').forEach(order => {
            order.items.forEach(item => {
                if (!productSales[item.id]) {
                    const mealDetails = meals.find(m => m.id === item.id);
                    productSales[item.id] = { 
                        name: item.name, 
                        sales: 0, 
                        avatar: mealDetails?.image || 'https://placehold.co/100x100.png',
                        dataAiHint: 'product' 
                    };
                }
                productSales[item.id].sales += item.price * item.quantity;
            })
        });

        return Object.values(productSales)
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 5)
            .map(p => ({...p, sales: `+XAF ${p.sales.toLocaleString()}`}));
    } catch (error) {
        console.error("Error fetching top selling products:", error);
        return [];
    }
}


export async function getRecentSales() {
    try {
        const orders = await getOrders();
        const completedOrders = orders.filter(o => o.status === 'Completed');
        const now = new Date();
        
        const salesByMonth: { [key: string]: number } = {};

        for (let i = 0; i < 6; i++) {
            const date = subMonths(now, i);
            const monthKey = format(date, 'yyyy-MM');
            salesByMonth[monthKey] = 0;
        }

        completedOrders.forEach(order => {
            const monthKey = format(new Date(order.timestamp), 'yyyy-MM');
            if (monthKey in salesByMonth) {
                const orderTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                salesByMonth[monthKey] += orderTotal;
            }
        });

        return Object.entries(salesByMonth)
            .map(([monthKey, sales]) => ({
                month: format(new Date(monthKey), 'MMMM'),
                sales,
            }))
            .reverse();
    } catch (error) {
        console.error("Error fetching recent sales:", error);
        return [];
    }
}

export async function getStaffPerformance() {
    try {
        const staff = await getStaff();
        const orders = await getOrders(); // Assuming orders have a 'cashierId' or similar field
        // This is a simplified mock as we don't store cashier ID on orders yet.
        // In a real app, you'd join orders and users tables.

        const relevantStaff = staff.filter(s => ['Waiter', 'Cashier', 'Manager'].includes(s.role));
        
        const performanceData = relevantStaff.map(s => ({
            ...s,
            totalSales: Math.floor(Math.random() * 500000) + 50000, // Random sales for demo
        }));
        
        return performanceData.sort((a, b) => b.totalSales - a.totalSales);
    } catch (error) {
        console.error("Error fetching staff performance:", error);
        return [];
    }
}
