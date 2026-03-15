import { NextRequest, NextResponse } from 'next/server';
import { getCategories, addCategory, updateCategory, deleteCategory } from '@/lib/db/categories';
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
        const categories = await getCategories();
        return NextResponse.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json(
            { error: 'Failed to fetch categories' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const categoryData = await request.json();

        if (!categoryData || !categoryData.name) {
            return NextResponse.json(
                { error: 'Category name is required' },
                { status: 400 }
            );
        }

        const actorId = await getActorId(categoryData.userEmail);
        const newCategory = await addCategory(categoryData);

        await addActivityLog(
            actorId,
            'MENU_CAT_CREATE',
            `Created menu category: ${newCategory.name}`,
            newCategory.name
        );

        return NextResponse.json(newCategory, { status: 201 });
    } catch (error) {
        console.error('Error adding category:', error);
        return NextResponse.json(
            { error: 'Failed to add category' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const categoryData = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: 'Category ID is required' },
                { status: 400 }
            );
        }

        const updatedCategory = await updateCategory({ ...categoryData, id });
        const actorId = await getActorId(categoryData.userEmail);

        await addActivityLog(
            actorId,
            'MENU_CAT_UPDATE',
            `Updated menu category: ${updatedCategory.name}`,
            updatedCategory.name
        );

        return NextResponse.json(updatedCategory);
    } catch (error) {
        console.error('Error updating category:', error);
        return NextResponse.json(
            { error: 'Failed to update category' },
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
                { error: 'Category ID is required' },
                { status: 400 }
            );
        }

        // Ideally we'd get the name first for the log
        await deleteCategory(id);
        const actorId = await getActorId(userEmail || undefined);

        await addActivityLog(
            actorId,
            'MENU_CAT_DELETE',
            `Deleted menu category ID: ${id}`,
            id
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting category:', error);
        return NextResponse.json(
            { error: 'Failed to delete category' },
            { status: 500 }
        );
    }
}
