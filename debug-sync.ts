
const { syncInventoryMovements } = require('./src/lib/accounting/automation');
const { initAccountingTables } = require('./src/lib/db/accounting');

try {
  console.log('Initializing tables...');
  initAccountingTables();
  
  console.log('Syncing inventory...');
  const result = syncInventoryMovements();
  console.log('Result:', result);
} catch (error) {
  console.error('Top level error:', error);
}
