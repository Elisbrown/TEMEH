// src/app/api/orders/split/route.ts
import { NextResponse } from 'next/server';
import { splitOrder } from '@/lib/db/orders';
import { addActivityLog } from '@/lib/db/activity-logs';
import { getStaffByEmail } from '@/lib/db/staff';

async function getActorId(email?: string) {
    if (!email || email === "system") return null;
    const user = await getStaffByEmail(email);
    return user ? Number(user.id) : null;
}

export async function POST(request: Request) {
    try {
        const { orderId, itemsToSplit, userEmail } = await request.json();
        if (!orderId || !itemsToSplit) {
            return NextResponse.json({ message: 'orderId and itemsToSplit are required' }, { status: 400 });
        }
        const result = await splitOrder(orderId, itemsToSplit);
        const actorId = await getActorId(userEmail);

        await addActivityLog(
            actorId,
            'ORDER_SPLIT',
            `Order ${orderId} split into a new order.`,
            orderId,
            { newOrderId: result.newOrder.id, itemsCount: itemsToSplit.length }
        );

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to split order', error: error.message }, { status: 500 });
    }
}
