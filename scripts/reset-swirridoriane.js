const Database = require("better-sqlite3");
const path = require("path");
const bcrypt = require("bcryptjs");

const dbPath = path.join(process.cwd(), "loungeos.db");
const db = new Database(dbPath);

const email = "swirridoriane@gmail.com";
const newPassword = "12345678";

console.log(`Resetting password for ${email}...`);

(async () => {
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Force password change on next login (1)
        const stmt = db.prepare("UPDATE users SET password = ?, force_password_change = 1 WHERE email = ?");
        const result = stmt.run(hashedPassword, email);

        if (result.changes > 0) {
            console.log(`Success! Password for ${email} has been reset to: ${newPassword}`);
            console.log("User will be required to change password on next login.");
        } else {
            console.log(`Error: User ${email} not found in database.`);
        }
    } catch (error) {
        console.error("Failed to reset password:", error);
    } finally {
        db.close();
    }
})();
