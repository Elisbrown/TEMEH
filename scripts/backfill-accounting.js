const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'loungeos.db');
const db = new Database(dbPath);

const ACCOUNTS = {
    CASH: '1000',
    INVENTORY: '1200',
    ACCOUNTS_PAYABLE: '2000',
    SALES_REVENUE: '4000',
    COGS: '5000',
    WASTE: '5900',
};

function createEntry(data) {
    // Check if exists
    const existing = db.prepare('SELECT id FROM journal_entries WHERE reference = ?').get(data.reference);
    if (existing) {
        console.log(`Skipping existing entry for ${data.reference}`);
        return;
    }

    const { lines, ...entryData } = data;
    const totalAmount = lines.reduce((sum, l) => sum + Math.max(l.debit, l.credit), 0);

    const info = db.prepare(`
        INSERT INTO journal_entries (entry_date, entry_type, description, reference, total_amount, created_by, status)
        VALUES (?, ?, ?, ?, ?, ?, 'posted')
    `).run(entryData.entry_date, entryData.entry_type, entryData.description, entryData.reference, totalAmount, 1);

    const entryId = info.lastInsertRowid;

    const lineStmt = db.prepare(`
        INSERT INTO journal_entry_lines (journal_entry_id, account_code, account_name, description, debit, credit)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    lines.forEach(line => {
        lineStmt.run(entryId, line.account_code, line.account_name, line.description || '', line.debit, line.credit);
    });

    console.log(`Created entry ${entryId} for ${data.reference}`);
}

try {
    console.log('Starting backfill...');

    // 1. Backfill Orders
    console.log('Processing Orders...');
    const orders = db.prepare("SELECT * FROM orders WHERE status = 'Completed'").all();

    for (const order of orders) {
        if (!order.total || order.total <= 0) continue;

        createEntry({
            entry_date: order.timestamp,
            entry_type: 'journal',
            description: `Sales Revenue - Order #${order.id.slice(0, 8)}`,
            reference: order.id,
            lines: [
                { account_code: ACCOUNTS.CASH, account_name: 'Cash', debit: order.total, credit: 0 },
                { account_code: ACCOUNTS.SALES_REVENUE, account_name: 'Sales Revenue', debit: 0, credit: order.total }
            ]
        });
    }

    // 2. Backfill Inventory Movements
    console.log('Processing Inventory Movements...');
    const movements = db.prepare(`
        SELECT m.*, i.name as item_name 
        FROM inventory_movements m
        LEFT JOIN inventory_items i ON m.item_id = i.id
    `).all();

    for (const m of movements) {
        const totalCost = m.total_cost || (m.quantity * (m.unit_cost || 0));
        if (totalCost <= 0) continue;

        const ref = `MOV-${m.id}`;

        if (m.movement_type === 'IN') {
            createEntry({
                entry_date: m.movement_date,
                entry_type: 'journal',
                description: `Inventory Purchase - ${m.item_name}`,
                reference: ref,
                lines: [
                    { account_code: ACCOUNTS.INVENTORY, account_name: 'Inventory', debit: totalCost, credit: 0 },
                    { account_code: ACCOUNTS.CASH, account_name: 'Cash', debit: 0, credit: totalCost }
                ]
            });
        } else if (m.movement_type === 'OUT') {
            createEntry({
                entry_date: m.movement_date,
                entry_type: 'journal',
                description: `Inventory Usage - ${m.item_name}`,
                reference: ref,
                lines: [
                    { account_code: ACCOUNTS.COGS, account_name: 'COGS', debit: totalCost, credit: 0 },
                    { account_code: ACCOUNTS.INVENTORY, account_name: 'Inventory', debit: 0, credit: totalCost }
                ]
            });
        }
    }

    console.log('Backfill complete!');

} catch (error) {
    console.error('Backfill failed:', error);
}
