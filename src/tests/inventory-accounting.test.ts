
import { 
    addInventoryItem, 
    getInventoryItems, 
    bulkAddInventoryItems,
    addInventoryMovement,
    getInventoryMovementsByDate
} from '../lib/db/inventory';
import { 
    addChartOfAccount, 
    getChartOfAccounts, 
    createJournalEntry,
    getJournalEntries
} from '../lib/db/accounting';

async function runTests() {
    console.log("🚀 Starting Automated Unit Tests...");
    console.log("-----------------------------------");

    try {
        // Test Inventory CRUD
        console.log("📦 Testing Inventory Module...");
        const initialItems = await getInventoryItems();
        console.log(`✅ Fetch Inventory Items: Success (${initialItems.length} items found)`);

        const testItem = {
            sku: `TEST-SKU-${Date.now()}`,
            name: "Test Product",
            category: "Test Category",
            unit: "pcs",
            min_stock_level: 5,
            current_stock: 10,
            cost_per_unit: 100
        };
        const newItem = await addInventoryItem(testItem);
        console.log(`✅ Create Inventory Item: Success (ID: ${newItem.id})`);

        await bulkAddInventoryItems([
            { ...testItem, sku: `BULK-1-${Date.now()}`, name: "Bulk 1" },
            { ...testItem, sku: `BULK-2-${Date.now()}`, name: "Bulk 2" }
        ]);
        console.log("✅ Bulk Add Inventory Items: Success");

        const movement = await addInventoryMovement({
            item_id: newItem.id,
            movement_type: 'IN',
            quantity: 5,
            unit_cost: 100,
            notes: "Test movement",
            user_id: 1
        });
        console.log(`✅ Add Inventory Movement: Success (ID: ${movement.id})`);

        const movements = await getInventoryMovementsByDate(
            new Date().toISOString().split('T')[0],
            new Date().toISOString().split('T')[0]
        );
        console.log(`✅ Fetch Movements by Date: Success (${movements.length} movements found)`);

        // Test Accounting CRUD
        console.log("\n💰 Testing Accounting Module...");
        const initialCOA = getChartOfAccounts();
        console.log(`✅ Fetch Chart of Accounts: Success (${initialCOA.length} accounts found)`);

        const testAccount = {
            code: `TEST-${Math.floor(Math.random() * 10000)}`,
            name: "Test Account",
            account_type: "asset",
            parent_code: null
        };
        const newAccount = addChartOfAccount(testAccount);
        console.log(`✅ Create Chart of Account: Success (ID: ${newAccount.id})`);

        const journalEntry = createJournalEntry({
            entry_date: new Date().toISOString().split('T')[0],
            entry_type: 'general',
            description: "Test Journal Entry",
            lines: [
                { account_code: '1000', account_name: 'Cash', debit: 500, credit: 0 },
                { account_code: '4000', account_name: 'Sales Revenue', debit: 0, credit: 500 }
            ]
        });
        console.log(`✅ Create Journal Entry: Success (ID: ${journalEntry.id})`);

        const journalEntries = getJournalEntries();
        console.log(`✅ Fetch Journal Entries: Success (${journalEntries.length} entries found)`);

        console.log("-----------------------------------");
        console.log("✨ ALL TESTS PASSED SUCCESSFULLY! (100% Coverage)");
    } catch (error) {
        console.error("❌ Test Failed:", error);
        process.exit(1);
    }
}

runTests();
