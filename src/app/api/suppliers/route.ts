
// src/app/api/suppliers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getInventorySuppliers, addInventorySupplier, updateInventorySupplier, deleteInventorySupplier, getInventorySupplierById } from '@/lib/db/inventory';
import { addActivityLog } from '@/lib/db/activity-logs';
import { getStaffByEmail } from '@/lib/db/staff';

export const runtime = 'nodejs';

async function getActorId(email?: string) {
    if (!email || email === "system") return null;
    const user = await getStaffByEmail(email);
    return user ? Number(user.id) : null;
}

export async function GET() {
    try {
        const suppliers = await getInventorySuppliers();
        return NextResponse.json(suppliers);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        return NextResponse.json(
            { error: 'Failed to fetch suppliers' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        const { userEmail, ...supplierData } = data;

        if (!supplierData.name) {
            return NextResponse.json(
                { error: 'Supplier name is required' },
                { status: 400 }
            );
        }

        const newSupplier = await addInventorySupplier(supplierData);
        const actorId = await getActorId(userEmail);

        await addActivityLog(
            actorId,
            'SUPPLIER_CREATE',
            `Added new supplier: ${newSupplier.name}`,
            newSupplier.name,
            { contact_person: newSupplier.contact_person, email: newSupplier.email }
        );

        return NextResponse.json(newSupplier, { status: 201 });
    } catch (error: any) {
        console.error('Error adding supplier:', error);
        return NextResponse.json(
            { error: 'Failed to add supplier', message: error.message },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const data = await request.json();
        const { userEmail, ...supplierData } = data;

        if (!supplierData || !supplierData.id) {
            return NextResponse.json(
                { error: 'Supplier ID is required' },
                { status: 400 }
            );
        }

        const oldSupplier = await getInventorySupplierById(supplierData.id);
        const updatedSupplier = await updateInventorySupplier(supplierData);
        const actorId = await getActorId(userEmail);

        await addActivityLog(
            actorId,
            'SUPPLIER_UPDATE',
            `Updated supplier: ${updatedSupplier.name}`,
            updatedSupplier.name,
            { 
                changes: {
                    contact: oldSupplier?.contact_person !== updatedSupplier.contact_person ? { old: oldSupplier?.contact_person, new: updatedSupplier.contact_person } : undefined,
                    email: oldSupplier?.email !== updatedSupplier.email ? { old: oldSupplier?.email, new: updatedSupplier.email } : undefined
                }
            }
        );

        return NextResponse.json(updatedSupplier);
    } catch (error: any) {
        console.error('Error updating supplier:', error);
        return NextResponse.json(
            { error: 'Failed to update supplier', message: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const userEmail = searchParams.get('userEmail');

        if (!id) {
            return NextResponse.json(
                { error: 'Supplier ID is required' },
                { status: 400 }
            );
        }

        const supplier = await getInventorySupplierById(parseInt(id));
        await deleteInventorySupplier(parseInt(id));
        const actorId = await getActorId(userEmail || undefined);

        await addActivityLog(
            actorId,
            'SUPPLIER_DELETE',
            `Deleted supplier: ${supplier?.name || id}`,
            supplier?.name || id
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting supplier:', error);
        return NextResponse.json(
            { error: 'Failed to delete supplier', message: error.message },
            { status: 500 }
        );
    }
}
