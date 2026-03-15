
// src/app/api/inventory/movements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getInventoryMovements, addInventoryMovement, getInventoryItemById, bulkAddInventoryMovements } from '@/lib/db/inventory';
import { addActivityLog } from '@/lib/db/activity-logs';
import { getStaffByEmail } from '@/lib/db/staff';
import { createInventoryMovementJournalEntry } from '@/lib/accounting/automation';

export const runtime = 'nodejs';

async function getActorId(email?: string) {
    if (!email || email === "system") return null;
    const user = await getStaffByEmail(email);
    return user ? Number(user.id) : null;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const itemId = searchParams.get('itemId');
        const limit = searchParams.get('limit');

        const movements = await getInventoryMovements(
            itemId ? Number(itemId) : undefined,
            limit ? Number(limit) : 100
        );

        return NextResponse.json(movements);
    } catch (error) {
        console.error('Error fetching inventory movements:', error);
        return NextResponse.json(
            { error: 'Failed to fetch inventory movements' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const userEmail = body.userEmail;

        if (body.movements && Array.isArray(body.movements)) {
            const actorId = await getActorId(userEmail);
            const movementsWithUser = body.movements.map((m: any) => ({
                ...m,
                user_id: actorId
            }));

            await bulkAddInventoryMovements(movementsWithUser);

            await addActivityLog(
                actorId,
                'BULK_STOCK_MOVEMENT',
                `Bulk stock movement processed for ${body.movements.length} items`,
                'SYSTEM',
                { count: body.movements.length }
            );

            return NextResponse.json({ success: true }, { status: 201 });
        }

        // Support both nested and flattened format for backward compatibility during transition
        const movementData = body.item_id ? body : body.movementData;

        if (!movementData || !movementData.item_id) {
            return NextResponse.json(
                { error: 'Invalid movement data' },
                { status: 400 }
            );
        }

        const actorId = await getActorId(userEmail);
        const newMovement = await addInventoryMovement({ ...movementData, user_id: actorId });
        const item = await getInventoryItemById(movementData.item_id);

        let action = 'STOCK_ADJUSTMENT';
        if (movementData.movement_type === 'IN') action = 'STOCK_IN';
        if (movementData.movement_type === 'OUT') action = 'STOCK_OUT';

        await addActivityLog(
            actorId,
            action,
            `${action.replace('_', ' ')} for item: ${item?.name || 'Unknown'}`,
            item?.sku || String(movementData.item_id),
            {
                quantity: movementData.quantity,
                type: movementData.reference_type,
                notes: movementData.notes
            }
        );

        // Accounting Automation
        await createInventoryMovementJournalEntry(newMovement, actorId || 1);

        return NextResponse.json(newMovement, { status: 201 });
    } catch (error: any) {
        console.error('Error adding inventory movement:', error);
        return NextResponse.json(
            { error: 'Failed to add inventory movement', message: error.message },
            { status: 500 }
        );
    }
}