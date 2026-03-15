// src/app/api/system-stats/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'temeh.db');

export async function GET() {
    try {
        const dbStats = await fs.stat(dbPath);
        const dbSize = dbStats.size;

        // Note: Server storage is a placeholder. In a real environment,
        // you would use a library like `diskusage` to get total/free disk space.
        // For this local simulation, we'll use a fixed total and calculate usage.
        const serverTotalStorage = 20 * 1024 * 1024 * 1024; // 20 GB
        const serverUsedStorage = dbSize + (500 * 1024 * 1024); // DB size + 500MB for app/node_modules etc.

        return NextResponse.json({
            dbSize,
            serverUsedStorage,
            serverTotalStorage,
        });

    } catch (error: any) {
        console.error('Failed to get system stats:', error);
        // If the DB doesn't exist, return zero values.
        if (error.code === 'ENOENT') {
            return NextResponse.json({
                dbSize: 0,
                serverUsedStorage: 500 * 1024 * 1024,
                serverTotalStorage: 20 * 1024 * 1024 * 1024,
            });
        }
        return NextResponse.json({ message: 'Failed to get system stats', error: error.message }, { status: 500 });
    }
}
