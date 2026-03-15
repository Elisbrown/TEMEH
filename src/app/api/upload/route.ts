
// src/app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { addActivityLog } from '@/lib/db/activity-logs';
import { getStaffByEmail } from '@/lib/db/staff';

async function getActorId(email?: string) {
    if (!email || email === "system") return null;
    const user = await getStaffByEmail(email);
    return user ? Number(user.id) : null;
}

export async function POST(request: Request) {
    try {
        const data = await request.formData();
        const file: File | null = data.get('file') as unknown as File;
        const type: 'staff' | 'meals' | 'logos' = data.get('type') as 'staff' | 'meals' | 'logos';
        const userEmail = data.get('userEmail') as string | null;

        if (!file) {
            return NextResponse.json({ success: false, message: 'No file provided.' }, { status: 400 });
        }
        if (!type) {
            return NextResponse.json({ success: false, message: 'Upload type is required.' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Define the upload directory - use UPLOAD_DIR env var in production (set by Electron)
        const baseUploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
        const uploadDir = path.join(baseUploadDir, type);
        if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
        }

        // Create a unique filename
        const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
        const filePath = path.join(uploadDir, filename);

        // Write the file to the server
        await writeFile(filePath, buffer);

        const actorId = await getActorId(userEmail || undefined);
        await addActivityLog(
            actorId,
            'FILE_UPLOAD',
            `Uploaded file: ${file.name} to ${type}`,
            file.name,
            { type, size: file.size, filename }
        );

        // Return the API path (will be served via /api/files)
        const publicPath = `/api/files/${type}/${filename}`;
        return NextResponse.json({ success: true, path: publicPath });

    } catch (error: any) {
        console.error('Upload failed:', error);
        return NextResponse.json({ success: false, message: 'Upload failed', error: error.message }, { status: 500 });
    }
}
