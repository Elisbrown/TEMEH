
// src/app/api/products/update-stock/route.ts
import { NextResponse } from 'next/server';
import { updateInventoryStockForSale } from '@/lib/db/products';
import { addActivityLog } from '@/lib/db/activity-logs';
import { getStaffByEmail } from '@/lib/db/staff';

async function getActorId(email?: string) {
    if (!email || email === "system") return null;
    const user = await getStaffByEmail(email);
    return user ? Number(user.id) : null;
}

export async function POST(request: Request) {
    try {
        const { inventoryId, quantitySold, userEmail } = await request.json();
        
        if (!inventoryId || !quantitySold) {
            return NextResponse.json({ 
                message: 'inventoryId and quantitySold are required' 
            }, { status: 400 });
        }
        
        await updateInventoryStockForSale(inventoryId, quantitySold);

        const actorId = await getActorId(userEmail);
        await addActivityLog(
            actorId,
            'STOCK_SALE_UPDATE',
            `Inventory stock reduced by ${quantitySold} due to sale`,
            inventoryId,
            { quantity: quantitySold, inventory_item_id: inventoryId }
        );

        return NextResponse.json({ 
            message: 'Inventory stock updated successfully' 
        });
    } catch (error: any) {
        return NextResponse.json({ 
            message: 'Failed to update inventory stock', 
            error: error.message 
        }, { status: 500 });
    }
} 