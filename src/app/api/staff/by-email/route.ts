
// src/app/api/staff/by-email/route.ts
import { NextResponse } from 'next/server';
import { getStaffByEmail } from '@/lib/db/staff';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');
        if (!email) {
            return NextResponse.json({ message: 'Email query parameter is required' }, { status: 400 });
        }
        const staffMember = await getStaffByEmail(email);
        if (!staffMember) {
            return NextResponse.json({ message: 'Staff member not found' }, { status: 404 });
        }
        return NextResponse.json(staffMember);
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to fetch staff member', error: error.message }, { status: 500 });
    }
}
