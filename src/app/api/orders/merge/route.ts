// src/app/api/orders/merge/route.ts
import { NextResponse } from 'next/server';
import { mergeOrders } from '@/lib/db/orders';
import { addActivityLog } from '@/lib/db/activity-logs';
import { getStaffByEmail } from '@/lib/db/staff';

async function getActorId(email?: string) {
    if (!email || email === "system") return null;
    const user = await getStaffByEmail(email);
    return user ? Number(user.id) : null;
}

export async function POST(request: Request) {
    try {
        const { fromOrderId, toOrderId, userEmail } = await request.json();
        if (!fromOrderId || !toOrderId) {
            return NextResponse.json({ message: 'fromOrderId and toOrderId are required' }, { status: 400 });
        }
        const mergedOrder = await mergeOrders(fromOrderId, toOrderId);
        const actorId = await getActorId(userEmail);

        await addActivityLog(
            actorId,
            'ORDER_MERGE',
            `Merged order ${fromOrderId} into ${toOrderId}`,
            toOrderId,
            { from: fromOrderId }
        );

        return NextResponse.json(mergedOrder);
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to merge orders', error: error.message }, { status: 500 });
    }
}
