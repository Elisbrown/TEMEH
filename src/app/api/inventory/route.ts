// src/app/api/inventory/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
    getInventoryItems, 
    addInventoryItem, 
    updateInventoryItem, 
    deleteInventoryItem,
    getInventoryCategories,
    getInventorySuppliers,
    getInventoryStats,
    getInventoryItemById,
    bulkAddInventoryItems
} from '@/lib/db/inventory';
import { addActivityLog } from '@/lib/db/activity-logs';
import { getStaffByEmail } from '@/lib/db/staff';

async function getActorId(email?: string) {
    if (!email || email === "system") return null;
    const user = await getStaffByEmail(email);
    return user ? Number(user.id) : null;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');

        switch (type) {
            case 'categories':
                const categories = await getInventoryCategories();
                return NextResponse.json(categories);
            
            case 'suppliers':
                const suppliers = await getInventorySuppliers();
                return NextResponse.json(suppliers);
            
            case 'stats':
                const stats = await getInventoryStats();
                return NextResponse.json(stats);
            
            default:
                const items = await getInventoryItems();
                return NextResponse.json(items);
        }
    } catch (error) {
        console.error('Error fetching inventory data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch inventory data' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (body.items && Array.isArray(body.items)) {
            const actorId = await getActorId(body.userEmail);
            await bulkAddInventoryItems(body.items);

            await addActivityLog(
                actorId,
                'STOCK_ITEM_BULK_CREATE',
                `Bulk added ${body.items.length} inventory items`,
                'SYSTEM',
                { count: body.items.length }
            );

            return NextResponse.json({ success: true }, { status: 201 });
        }

        const itemData = body;
        if (!itemData || Object.keys(itemData).length === 0) {
            return NextResponse.json(
                { error: 'Item data is required' },
                { status: 400 }
            );
        }

        const actorId = await getActorId(itemData.userEmail);
        const newItem = await addInventoryItem(itemData);

        await addActivityLog(
            actorId,
            'STOCK_ITEM_CREATE',
            `Added new inventory item: ${newItem.name}`,
            newItem.sku,
            { current_stock: newItem.current_stock, category: newItem.category }
        );

        // Auto-post to Accounting for Initial Stock
        if (newItem.current_stock > 0 && newItem.cost_per_unit) {
            const { createJournalEntry, getAccountByCode } = await import('@/lib/db/accounting');
            // Assuming 1200 Inventory / 3000 Owner's Equity (Opening Balance) or 1000 Cash
            // Using 3000 Owner's Equity for initial setup is safer, but user asked for "Purchase" style
            // If it's new item purchase, 1000 Cash or 2000 AP. Let's use 2000 AP (or Opening Balance)
            // Let's use a generic description.
            
            await createJournalEntry({
                entry_date: new Date().toISOString(),
                entry_type: 'INITIAL_STOCK',
                description: `Initial Stock - ${newItem.name}`,
                reference: newItem.sku,
                created_by: actorId || 1,
                lines: [
                    { account_code: '1200', account_name: 'Inventory', debit: newItem.current_stock * newItem.cost_per_unit, credit: 0 },
                    { account_code: '3000', account_name: "Owner's Equity", debit: 0, credit: newItem.current_stock * newItem.cost_per_unit }
                ]
            });
        }

        return NextResponse.json(newItem, { status: 201 });
    } catch (error) {
        console.error('Error adding inventory item:', error);
        return NextResponse.json(
            { error: 'Failed to add inventory item' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...itemData } = body;

        if (!id) {
            return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
        }

        const oldItem = await getInventoryItemById(id);
        const updatedItem = await updateInventoryItem(id, itemData);
        const actorId = await getActorId(itemData.userEmail);

        await addActivityLog(
            actorId,
            'STOCK_ITEM_UPDATE',
            `Updated inventory item: ${updatedItem.name}`,
            updatedItem.sku,
            {
                changes: {
                    price: oldItem?.cost_per_unit !== updatedItem.cost_per_unit ? { old: oldItem?.cost_per_unit, new: updatedItem.cost_per_unit } : undefined,
                    stock: oldItem?.current_stock !== updatedItem.current_stock ? { old: oldItem?.current_stock, new: updatedItem.current_stock } : undefined
                }
            }
        );

        return NextResponse.json(updatedItem);
    } catch (error) {
        console.error('Error updating inventory item:', error);
        return NextResponse.json(
            { error: 'Failed to update inventory item' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id') || (await request.json()).id;
        const userEmail = searchParams.get('userEmail');

        if (!id) {
            return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
        }

        const item = await getInventoryItemById(id);
        const actorId = await getActorId(userEmail || undefined);

        await deleteInventoryItem(id);

        await addActivityLog(
            actorId,
            'STOCK_ITEM_DELETE',
            `Deleted inventory item: ${item?.name || 'Unknown'}`,
            item?.sku || String(id)
        );

        return NextResponse.json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        return NextResponse.json(
            { error: 'Failed to delete inventory item' },
            { status: 500 }
        );
    }
} 