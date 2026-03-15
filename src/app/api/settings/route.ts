// src/app/api/settings/route.ts
import { NextResponse } from 'next/server';
import { getSettings, setSettings, updateSetting, saveImage, deleteImage } from '@/lib/db/settings';
import { addActivityLog } from '@/lib/db/activity-logs';
import { getStaffByEmail } from '@/lib/db/staff';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

async function getActorId(email?: string) {
    if (!email || email === "system") return null;
    const user = await getStaffByEmail(email);
    return user ? Number(user.id) : null;
}

export async function GET() {
    try {
        const settings = await getSettings();
        return NextResponse.json(settings);
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to fetch settings', error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');
        const settingsData = await request.json();
        const actorId = await getActorId(settingsData.userEmail);
        
        if (key) {
            await updateSetting(key as any, settingsData.value);
            await addActivityLog(
                actorId,
                'SETTINGS_UPDATE',
                `Updated specific setting: ${key}`,
                key,
                { value: settingsData.value }
            );
        } else {
            await setSettings(settingsData.settings);
            await addActivityLog(
                actorId,
                'SETTINGS_BULK_UPDATE',
                'Updated multiple application settings',
                'GLOBAL_SETTINGS'
            );
        }
        
        return NextResponse.json({ message: 'Settings updated successfully' });
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to update settings', error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const type = formData.get('type') as string; // 'logo' or 'carousel'
        const userEmail = formData.get('userEmail') as string;
        
        if (!file) {
            return NextResponse.json({ message: 'No file provided' }, { status: 400 });
        }
        
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ message: 'File must be an image' }, { status: 400 });
        }
        
        const fileExtension = path.extname(file.name);
        const filename = `${type}-${uuidv4()}${fileExtension}`;
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const imagePath = await saveImage(buffer, filename);
        console.log(`[Settings API] saveImage returned: ${imagePath} for type ${type}`);
        
        const actorId = await getActorId(userEmail);

        await addActivityLog(
            actorId,
            'IMAGE_UPLOAD',
            `Uploaded ${type} image: ${filename}`,
            type.toUpperCase(),
            { filename, path: imagePath }
        );
        
        return NextResponse.json({ 
            message: 'Image uploaded successfully',
            imagePath: imagePath
        });
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to upload image', error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const imagePath = searchParams.get('imagePath');
        const userEmail = searchParams.get('userEmail');
        
        if (!imagePath) {
            return NextResponse.json({ message: 'Image path is required' }, { status: 400 });
        }
        
        await deleteImage(imagePath);
        const actorId = await getActorId(userEmail || undefined);

        await addActivityLog(
            actorId,
            'IMAGE_DELETE',
            `Deleted image: ${imagePath}`,
            'IMAGE',
            { path: imagePath }
        );
        
        return NextResponse.json({ message: 'Image deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ message: 'Failed to delete image', error: error.message }, { status: 500 });
    }
} 