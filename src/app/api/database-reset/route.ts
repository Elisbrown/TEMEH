// src/app/api/database-reset/route.ts
import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { addActivityLog } from "@/lib/db/activity-logs";
import { getStaffByEmail } from "@/lib/db/staff";

export const runtime = "nodejs";

const MASTER_PIN = "2304";
const PROTECTED_EMAIL = "sunyinelisbrown@gmail.com";

// Allowed tables that can be reset
const ALLOWED_TABLES = [
    "orders",
    "products",
    "inventory_items",
    "inventory_movements",
    "tables",
    "floors",
    "categories",
    "activity_logs",
    "notes",
    "events",
    "accounting_entries",
];

function getDb() {
    const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), "temeh.db");
    return new Database(dbPath);
}

async function getActorId(email?: string) {
    if (!email || email === "system") return null;
    const user = await getStaffByEmail(email);
    return user ? Number(user.id) : null;
}

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const { tables, masterPin, userEmail } = data;

        // Verify master PIN
        if (masterPin !== MASTER_PIN) {
            return NextResponse.json(
                { error: "Invalid master PIN" },
                { status: 403 }
            );
        }

        // Validate tables array
        if (!tables || !Array.isArray(tables) || tables.length === 0) {
            return NextResponse.json(
                { error: "No tables specified for reset" },
                { status: 400 }
            );
        }

        // Verify caller is Super Admin
        if (userEmail) {
            const user = await getStaffByEmail(userEmail);
            if (!user || user.role !== "Super Admin") {
                return NextResponse.json(
                    { error: "Only Super Admin can perform database reset" },
                    { status: 403 }
                );
            }
        }

        // Validate all tables are allowed
        const invalidTables = tables.filter((t: string) => !ALLOWED_TABLES.includes(t));
        if (invalidTables.length > 0) {
            return NextResponse.json(
                { error: `Invalid tables: ${invalidTables.join(", ")}` },
                { status: 400 }
            );
        }

        const db = getDb();
        const resetResults: { table: string; rows: number }[] = [];

        // Reset each table
        for (const tableName of tables) {
            try {
                // Special handling for users table - never allow direct reset
                if (tableName === "users") {
                    continue;
                }

                // Special handling for order_items which references orders
                if (tableName === "orders") {
                    const orderItemsResult = db.prepare("DELETE FROM order_items").run();
                    resetResults.push({ table: "order_items", rows: orderItemsResult.changes });
                }

                // Delete all rows from the table
                const result = db.prepare(`DELETE FROM ${tableName}`).run();
                resetResults.push({ table: tableName, rows: result.changes });
            } catch (tableError: any) {
                console.error(`Error resetting table ${tableName}:`, tableError);
                // Continue with other tables even if one fails
            }
        }

        db.close();

        // Log the activity
        const actorId = await getActorId(userEmail);
        await addActivityLog(
            actorId,
            "DATABASE_RESET",
            `Reset ${tables.length} database table(s): ${tables.join(", ")}`,
            "SYSTEM",
            { tables, resetResults }
        );

        return NextResponse.json({
            success: true,
            message: `Successfully reset ${resetResults.length} table(s)`,
            results: resetResults,
        });
    } catch (error: any) {
        console.error("Database reset error:", error);
        return NextResponse.json(
            { error: "Failed to reset database: " + error.message },
            { status: 500 }
        );
    }
}
