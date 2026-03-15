const Database = require('better-sqlite3');
const path = require('path');

const db = new Database('loungeos.db');
try {
    const users = db.prepare('SELECT email, name, role FROM users').all();
    console.log('Current Users:');
    console.log(JSON.stringify(users, null, 2));
} catch (e) {
    console.log('Error reading users:', e.message);
} finally {
    db.close();
}
