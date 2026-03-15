import Database from 'better-sqlite3';
import path from 'path';

interface AccountBalance {
  account_code: string;
  account_name: string;
  account_type: string;
  balance: number;
}

interface ProfitAndLossReport {
  period: { start: string; end: string };
  revenue: AccountBalance[];
  expenses: AccountBalance[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

interface BalanceSheetReport {
  asOfDate: string;
  assets: AccountBalance[];
  liabilities: AccountBalance[];
  equity: AccountBalance[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

interface CashFlowReport {
  period: { start: string; end: string };
  operating: { description: string; amount: number }[];
  investing: { description: string; amount: number }[];
  financing: { description: string; amount: number }[];
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
}

function getDb(): Database.Database {
  const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db');
  return new Database(dbPath);
}

export function generateProfitAndLoss(startDate: string, endDate: string): ProfitAndLossReport {
  const db = getDb();
  try {
    // Ensure tables exist
    const { initAccountingTables } = require('../db/accounting');
    initAccountingTables();

    // Get all account balances for the period
    const query = `
      SELECT 
        jel.account_code,
        jel.account_name,
        coa.account_type,
        SUM(jel.credit - jel.debit) as balance
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      JOIN chart_of_accounts coa ON jel.account_code = coa.code
      WHERE je.entry_date >= ? AND je.entry_date <= ?
        AND je.status != 'draft'
        AND coa.account_type IN ('revenue', 'expense')
      GROUP BY jel.account_code, jel.account_name, coa.account_type
      HAVING ABS(balance) > 0.01
      ORDER BY jel.account_code
    `;

    const stmt = db.prepare(query);
    const results = stmt.all(startDate, endDate) as AccountBalance[];

    const revenue = results.filter(r => r.account_type === 'revenue');
    const expenses = results.filter(r => r.account_type === 'expense').map(e => ({
      ...e,
      balance: Math.abs(e.balance) // Expenses are positive in P&L
    }));

    const totalRevenue = revenue.reduce((sum, r) => sum + r.balance, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.balance, 0);

    return {
      period: { start: startDate, end: endDate },
      revenue,
      expenses,
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
    };
  } finally {
    db.close();
  }
}

export function generateBalanceSheet(asOfDate: string): BalanceSheetReport {
  const db = getDb();
  try {
    // Get all account balances up to the date
    const query = `
      SELECT 
        jel.account_code,
        jel.account_name,
        coa.account_type,
        SUM(jel.debit - jel.credit) as balance
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      JOIN chart_of_accounts coa ON jel.account_code = coa.code
      WHERE je.entry_date <= ?
        AND je.status != 'draft'
        AND coa.account_type IN ('asset', 'liability', 'equity')
      GROUP BY jel.account_code, jel.account_name, coa.account_type
      HAVING ABS(balance) > 0.01
      ORDER BY jel.account_code
    `;

    const stmt = db.prepare(query);
    const results = stmt.all(asOfDate) as AccountBalance[];

    const assets = results.filter(r => r.account_type === 'asset');
    const liabilities = results.filter(r => r.account_type === 'liability').map(l => ({
      ...l,
      balance: Math.abs(l.balance)
    }));
    const equity = results.filter(r => r.account_type === 'equity').map(e => ({
      ...e,
      balance: Math.abs(e.balance)
    }));

    const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
    const totalEquity = equity.reduce((sum, e) => sum + e.balance, 0);

    return {
      asOfDate,
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
    };
  } finally {
    db.close();
  }
}

export function generateCashFlow(startDate: string, endDate: string): CashFlowReport {
  const db = getDb();
  try {
    // Simplified cash flow - get all cash account transactions
    const query = `
      SELECT 
        jel.description,
        SUM(jel.debit - jel.credit) as amount,
        coa.account_type
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      JOIN chart_of_accounts coa ON jel.account_code = coa.code
      WHERE je.entry_date >= ? AND je.entry_date <= ?
        AND je.status != 'draft'
        AND jel.account_code = '1000'
      GROUP BY jel.description, coa.account_type
      ORDER BY je.entry_date
    `;

    const stmt = db.prepare(query);
    const results = stmt.all(startDate, endDate) as any[];

    // Get beginning cash balance
    const beginningQuery = `
      SELECT SUM(jel.debit - jel.credit) as balance
      FROM journal_entry_lines jel
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE je.entry_date < ?
        AND je.status != 'draft'
        AND jel.account_code = '1000'
    `;
    const beginningStmt = db.prepare(beginningQuery);
    const beginningResult = beginningStmt.get(startDate) as { balance: number | null };
    const beginningCash = beginningResult?.balance || 0;

    // Categorize transactions (simplified - all in operating for now)
    const operating = results.map(r => ({
      description: r.description || 'Cash transaction',
      amount: r.amount
    }));

    const netCashFlow = operating.reduce((sum, item) => sum + item.amount, 0);

    return {
      period: { start: startDate, end: endDate },
      operating,
      investing: [],
      financing: [],
      netCashFlow,
      beginningCash,
      endingCash: beginningCash + netCashFlow,
    };
  } finally {
    db.close();
  }
}
