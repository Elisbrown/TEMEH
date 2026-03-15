import { createJournalEntry, getJournalEntries } from '@/lib/db/accounting';
import { getOrders } from '@/lib/db/orders';
import { getInventoryMovements } from '@/lib/db/inventory';
import { getPayouts, getAdvances } from '@/lib/db/payroll';
import { getExpenses } from '@/lib/db/expenses';

import type { Order } from '@/context/order-context';
import type { InventoryMovement } from '@/lib/db/inventory';

// Account Codes (from default seed)
const ACCOUNTS = {
  CASH: '1000',
  INVENTORY: '1200',
  ACCOUNTS_PAYABLE: '2000',
  SALES_REVENUE: '4000',
  COGS: '5000',
  SALARIES_EXPENSE: '5100',
  RENT_EXPENSE: '5200',
  UTILITIES_EXPENSE: '5300',
  GENERAL_EXPENSE: '5800',
  WASTE_EXPENSE: '5900',
  ACCOUNTS_RECEIVABLE_EMPLOYEE: '1100', // Using AR for advances
};

export async function createOrderJournalEntry(order: Order, userId: number) {
  try {
    if (order.status !== 'Completed') return;

    // Basic validation
    if (!order.total || order.total <= 0) return;

    // Debit Cash, Credit Sales
    // TODO: Handle Taxes (Credit Tax Payable), Discounts (Debit Discount Expense)

    await createJournalEntry({
      entry_date: new Date().toISOString(),
      entry_type: 'sales', // Use 'sales' to match frontend filter
      description: `Sales Revenue - Order #${order.id.slice(0, 8)}`,
      reference: order.id,
      created_by: userId,
      lines: [
        {
          account_code: ACCOUNTS.CASH,
          account_name: 'Cash',
          description: `Payment for Order #${order.id.slice(0, 8)}`,
          debit: order.total,
          credit: 0
        },
        {
          account_code: ACCOUNTS.SALES_REVENUE,
          account_name: 'Sales Revenue',
          description: `Revenue from Order #${order.id.slice(0, 8)}`,
          debit: 0,
          credit: order.total
        }
      ]
    });

  } catch (error) {
    console.error(`Failed to create journal entry for order ${order.id}:`, error);
    // Don't throw, just log. We don't want to block the order completion if accounting fails.
  }
}

export async function createInventoryMovementJournalEntry(movement: InventoryMovement, userId: number) {
  try {
    const totalCost = movement.total_cost || (movement.quantity * (movement.unit_cost || 0));

    if (totalCost <= 0) return;

    if (movement.movement_type === 'IN') {
      // Asset Increase (Debit Inventory), Cash Decrease (Credit Cash)
      // Assuming cash purchase. If Reference is PO, might be Accounts Payable.
      // For now, let's assume Cash for simplicity or AP if reference_type is PURCHASE_ORDER

      const creditAccount = movement.reference_type === 'PURCHASE_ORDER' ? ACCOUNTS.ACCOUNTS_PAYABLE : ACCOUNTS.CASH;
      const creditAccountName = movement.reference_type === 'PURCHASE_ORDER' ? 'Accounts Payable' : 'Cash';

      await createJournalEntry({
        entry_date: new Date().toISOString(),
        entry_type: 'journal',
        description: `Inventory Purchase - ${movement.item?.name || 'Item'}`,
        reference: `MOV-${movement.id}`,
        created_by: userId,
        lines: [
          {
            account_code: ACCOUNTS.INVENTORY,
            account_name: 'Inventory',
            description: `Stock In: ${movement.item?.name}`,
            debit: totalCost,
            credit: 0
          },
          {
            account_code: creditAccount,
            account_name: creditAccountName,
            description: `Payment/Liability for Stock In`,
            debit: 0,
            credit: totalCost
          }
        ]
      });
    } else if (movement.movement_type === 'OUT') {
      // Asset Decrease (Credit Inventory), Expense Increase (Debit COGS or Waste)

      let debitAccount = ACCOUNTS.COGS;
      let debitAccountName = 'Cost of Goods Sold';

      if (movement.reference_type === 'WASTE' || movement.reference_type === 'DAMAGE' || movement.reference_type === 'THEFT') {
        debitAccount = ACCOUNTS.WASTE_EXPENSE; // Or specific waste account
        debitAccountName = 'Miscellaneous Expenses (Waste/Loss)';
      }

      await createJournalEntry({
        entry_date: new Date().toISOString(),
        entry_type: 'expense',
        description: `Inventory Usage/Loss - ${movement.item?.name || 'Item'}`,
        reference: `MOV-${movement.id}`,
        created_by: userId,
        lines: [
          {
            account_code: debitAccount,
            account_name: debitAccountName,
            description: `Stock Out (${movement.reference_type}): ${movement.item?.name}`,
            debit: totalCost,
            credit: 0
          },
          {
            account_code: ACCOUNTS.INVENTORY,
            account_name: 'Inventory',
            description: `Asset deduction for ${movement.item?.name}`,
            debit: 0,
            credit: totalCost
          }
        ]
      });
    }


  } catch (error) {
    console.error(`Failed to create journal entry for movement ${movement.id}:`, error);
  }
}

export async function createPayoutJournalEntry(payout: any, userId: number) {
  try {
    if (payout.net_amount <= 0) return;

    await createJournalEntry({
      entry_date: payout.payment_date,
      entry_type: 'expense', // Track as expense
      description: `Salary Payout - ${payout.employee?.name || 'Staff'}`,
      reference: `PAY-${payout.id}`,
      created_by: userId,
      lines: [
        {
          account_code: ACCOUNTS.SALARIES_EXPENSE,
          account_name: 'Salaries & Wages',
          description: `Net payout for ${payout.employee?.name}`,
          debit: payout.net_amount,
          credit: 0
        },
        {
          account_code: ACCOUNTS.CASH,
          account_name: 'Cash',
          description: `Cash payout to staff`,
          debit: 0,
          credit: payout.net_amount
        }
      ]
    });
  } catch (error) {
    console.error(`Failed to create journal entry for payout ${payout.id}:`, error);
  }
}

export async function createAdvanceJournalEntry(advance: any, userId: number) {
  try {
    if (advance.status !== 'approved' || advance.amount <= 0) return;

    await createJournalEntry({
      entry_date: advance.date,
      entry_type: 'expense', // Track as expense
      description: `Salary Advance - ${advance.employee?.name || 'Staff'}`,
      reference: `ADV-${advance.id}`,
      created_by: userId,
      lines: [
        {
          account_code: ACCOUNTS.ACCOUNTS_RECEIVABLE_EMPLOYEE,
          account_name: 'Employee Advances',
          description: `Advance given to ${advance.employee?.name}`,
          debit: advance.amount,
          credit: 0
        },
        {
          account_code: ACCOUNTS.CASH,
          account_name: 'Cash',
          description: `Cash advance payment`,
          debit: 0,
          credit: advance.amount
        }
      ]
    });
  } catch (error) {
    console.error(`Failed to create journal entry for advance ${advance.id}:`, error);
  }
}

export async function createExpenseJournalEntry(expense: any, userId: number) {
  try {
    if (expense.amount <= 0) return;

    let accountCode = ACCOUNTS.GENERAL_EXPENSE;
    let accountName = 'General Expenses';

    if (expense.category?.toLowerCase() === 'rent') {
      accountCode = ACCOUNTS.RENT_EXPENSE;
      accountName = 'Rent Expense';
    } else if (expense.category?.toLowerCase() === 'utilities') {
      accountCode = ACCOUNTS.UTILITIES_EXPENSE;
      accountName = 'Utilities Expense';
    }

    await createJournalEntry({
      entry_date: expense.date,
      entry_type: 'expense',
      description: `Expense: ${expense.description || expense.category}`,
      reference: `EXP-${expense.id}`,
      created_by: userId,
      lines: [
        {
          account_code: accountCode,
          account_name: accountName,
          description: expense.description,
          debit: expense.amount,
          credit: 0
        },
        {
          account_code: ACCOUNTS.CASH,
          account_name: 'Cash',
          description: `Cash payment for expense`,
          debit: 0,
          credit: expense.amount
        }
      ]
    });
  } catch (error) {
    console.error(`Failed to create journal entry for expense ${expense.id}:`, error);
  }
}

export function getSyncStatus() {
  // For now, return a static healthy status or query last run time if we stored it
  return {
    status: 'idle',
    lastSync: new Date().toISOString()
  };
}

export async function syncAllTransactions(startDate?: string, endDate?: string): Promise<{ totalSynced: number, totalAvailable: number }> {
  let syncedCount = 0;
  let availableCount = 0;

  // 1. Sync Orders
  const allOrders = await getOrders();
  const orders = allOrders.filter(o => o.status === 'Completed');
  availableCount += orders.length;

  for (const order of orders) {
    // Check if journal exists
    const journals = getJournalEntries({ reference: order.id });
    if (journals.length === 0) {
      // Re-create mechanism
      await createOrderJournalEntry(order, 1); // 1 = system/admin
      syncedCount++;
    }
  }

  // 2. Sync Inventory Movements
  const movements = await getInventoryMovements(undefined, 1000); // Fetch last 1000
  availableCount += movements.length;

  for (const m of movements) {
    const ref = `MOV-${m.id}`;
    const journals = getJournalEntries({ reference: ref });
    if (journals.length === 0) {
      await createInventoryMovementJournalEntry(m, 1);
      syncedCount++;
    }
  }

  // 3. Sync Payouts
  const payouts = await getPayouts();
  availableCount += payouts.length;
  for (const p of payouts) {
    const journals = getJournalEntries({ reference: `PAY-${p.id}` });
    if (journals.length === 0) {
      await createPayoutJournalEntry(p, 1);
      syncedCount++;
    }
  }

  // 4. Sync Advances
  const advances = await getAdvances();
  const approvedAdvances = advances.filter(a => a.status === 'approved');
  availableCount += approvedAdvances.length;
  for (const a of approvedAdvances) {
    const journals = getJournalEntries({ reference: `ADV-${a.id}` });
    if (journals.length === 0) {
      await createAdvanceJournalEntry(a, 1);
      syncedCount++;
    }
  }

  // 5. Sync Expenses
  const expenses = await getExpenses();
  availableCount += expenses.length;
  for (const e of expenses) {
    const journals = getJournalEntries({ reference: `EXP-${e.id}` });
    if (journals.length === 0) {
      await createExpenseJournalEntry(e, 1);
      syncedCount++;
    }
  }

  return { totalSynced: syncedCount, totalAvailable: availableCount };
}
