import { NextResponse } from 'next/server';
import { isAppSetup } from '@/lib/db/staff';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const setup = await isAppSetup();
        return NextResponse.json({ isSetup: setup });
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to check setup status', error: error.message }, { status: 500 });
    }
}
