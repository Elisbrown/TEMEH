// src/app/api/products/route.ts
import { NextResponse } from 'next/server';
import { getMeals, getUnifiedProducts, addMeal, updateMeal, deleteMeal, getMealById } from '@/lib/db/products';
import { addActivityLog } from '@/lib/db/activity-logs';
import { getStaffByEmail } from '@/lib/db/staff';

export const runtime = 'nodejs';

async function getActorId(email?: string) {
    if (!email || email === "system") return null;
    const user = await getStaffByEmail(email);
    return user ? Number(user.id) : null;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const unified = searchParams.get('unified');

        if (unified === 'true') {
            const products = await getUnifiedProducts();
            return NextResponse.json(products);
        } else {
            const meals = await getMeals();
            return NextResponse.json(meals);
        }
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to fetch products', error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const mealData = await request.json();
        const newMeal = await addMeal(mealData);
        const actorId = await getActorId(mealData.userEmail);

        await addActivityLog(
            actorId,
            'MENU_ITEM_CREATE',
            `Added new menu item: ${newMeal.name}`,
            newMeal.name,
            { category: newMeal.category, price: newMeal.price }
        );

        return NextResponse.json(newMeal, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to add meal', error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ message: 'ID query parameter is required' }, { status: 400 });
        }
        const mealData = await request.json();
        const oldMeal = await getMealById(id);
        const updatedMeal = await updateMeal(mealData);
        const actorId = await getActorId(mealData.userEmail);

        const changes: Record<string, { old: any, new: any }> = {};
        if (oldMeal) {
            if (oldMeal.price != updatedMeal.price) changes.price = { old: oldMeal.price, new: updatedMeal.price }; // Use != for loose equality if types drift
            if (oldMeal.name !== updatedMeal.name) changes.name = { old: oldMeal.name, new: updatedMeal.name };
            if (oldMeal.category !== updatedMeal.category) changes.category = { old: oldMeal.category, new: updatedMeal.category };
            if (oldMeal.image !== updatedMeal.image) changes.image = { old: 'old_image', new: 'new_image' }; // Don't log full base64
        }

        await addActivityLog(
            actorId,
            'MENU_ITEM_UPDATE',
            `Updated menu item: ${updatedMeal.name}`,
            updatedMeal.name,
            { changes }
        );

        return NextResponse.json(updatedMeal);
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to update meal', error: error.message }, { status: 500 });
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

        const meal = await getMealById(id);
        await deleteMeal(id);
        const actorId = await getActorId(userEmail || undefined);

        await addActivityLog(
            actorId,
            'MENU_ITEM_DELETE',
            `Deleted menu item: ${meal?.name || 'Unknown'}`,
            meal?.name || id
        );

        return NextResponse.json({ message: 'Meal deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to delete meal', error: error.message }, { status: 500 });
    }
}
