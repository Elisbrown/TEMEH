import { NextRequest, NextResponse } from 'next/server';
import { getOrders, addOrder, updateOrder, updateOrderStatus, deleteOrder, getOrderById } from '@/lib/db/orders';
import { addActivityLog } from '@/lib/db/activity-logs';
import { getStaffByEmail } from '@/lib/db/staff';
import { syncAllTransactions } from '@/lib/accounting/automation';

export const runtime = 'nodejs';

async function getActorId(email?: string) {
    if (!email || email === "system") return null;
    const user = await getStaffByEmail(email);
    return user ? Number(user.id) : null;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const statusParam = searchParams.get('status');

        const allOrders = await getOrders();

        if (statusParam) {
            if (statusParam.toLowerCase() === 'pending') {
                const pendingOrders = allOrders.filter(order =>
                    order.status === 'Pending' || order.status === 'In Progress' || order.status === 'Ready'
                );
                return NextResponse.json(pendingOrders);
            } else {
                const filteredOrders = allOrders.filter(order =>
                    order.status.toLowerCase() === statusParam.toLowerCase()
                );
                return NextResponse.json(filteredOrders);
            }
        }

        return NextResponse.json(allOrders);
    } catch (error: any) {
        console.error('Failed to fetch orders:', error);
        return NextResponse.json({ message: 'Failed to fetch orders', error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const orderData = await request.json();
        const newOrder = await addOrder(orderData);
        const actorId = await getActorId(orderData.userEmail);

        await addActivityLog(
            actorId,
            'ORDER_CREATE',
            `Order for table ${orderData.table} created.`,
            newOrder.id,
            { total: newOrder.total, itemsCount: orderData.items?.length }
        );

        // Auto-sync to accounting if completed
        if (newOrder.status === 'Completed') {
            try {
                await syncAllTransactions();
            } catch (syncError) {
                console.error("Failed to auto-sync accounting after order:", syncError);
            }
        }

        return NextResponse.json(newOrder, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to add order', error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ message: 'ID query parameter is required' }, { status: 400 });
        }

        const orderData = await request.json();
        const oldOrder = await getOrderById(id);
        const actorId = await getActorId(orderData.userEmail);

        if (orderData.status && !orderData.items) {
            if (orderData.total !== undefined || orderData.discount !== undefined) {
                const updatedOrder = await updateOrder({ ...orderData, id });
                await addActivityLog(
                    actorId,
                    'ORDER_UPDATE',
                    `Order ${id} details updated.`,
                    id,
                    { total: orderData.total, discount: orderData.discount }
                );
                return NextResponse.json(updatedOrder);
            }

            const updatedOrder = await updateOrderStatus(
                id,
                orderData.status,
                orderData.cancelled_by,
                orderData.cancellation_reason,
                orderData.cancelled_at
            );

            if (orderData.status === 'Canceled') {
                await addActivityLog(
                    orderData.cancelled_by ? Number(orderData.cancelled_by) : actorId,
                    'ORDER_VOID',
                    `Order ${id} voided. Reason: ${orderData.cancellation_reason || 'No reason provided'}`,
                    id,
                    { reason: orderData.cancellation_reason, total: oldOrder?.total }
                );
            } else if (orderData.status === 'Completed' && oldOrder?.status !== 'Completed') {
                await addActivityLog(actorId, 'ORDER_COMPLETE', `Order ${id} marked as completed.`, id, { total: oldOrder?.total });

                // Auto-sync to accounting
                try {
                    await syncAllTransactions();
                } catch (syncError) {
                    console.error("Failed to auto-sync accounting after order completion:", syncError);
                }
            } else {
                await addActivityLog(
                    actorId,
                    'ORDER_STATUS_UPDATE',
                    `Order ${id} status: ${oldOrder?.status} -> ${orderData.status}`,
                    id,
                    { from: oldOrder?.status, to: orderData.status }
                );
            }

            return NextResponse.json(updatedOrder);
        } else {
            const updatedOrder = await updateOrder({ ...orderData, id });
            await addActivityLog(
                actorId,
                'ORDER_UPDATE',
                `Order ${id} updated by staff.`,
                id,
                { old_total: oldOrder?.total, new_total: updatedOrder.total }
            );
            return NextResponse.json(updatedOrder);
        }
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to update order', error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const userEmail = searchParams.get('userEmail');
        if (!id) {
            return NextResponse.json({ message: 'ID query parameter is required' }, { status: 400 });
        }

        const order = await getOrderById(id);
        const actorId = await getActorId(userEmail || undefined);
        await deleteOrder(id);

        await addActivityLog(
            actorId,
            'ORDER_DELETE',
            `Order ${id} permanently deleted from system.`,
            id,
            { table: order?.table, total: order?.total }
        );

        return NextResponse.json({ message: 'Order deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to delete order', error: error.message }, { status: 500 });
    }
}
