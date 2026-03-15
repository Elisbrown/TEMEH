import { NextResponse } from 'next/server';
import { getStaffByEmail, verifyPassword, updatePassword as dbUpdatePassword } from '@/lib/db/staff';
import { addActivityLog } from '@/lib/db/activity-logs';

export const runtime = 'nodejs';

async function handleLogin(request: Request) {
    let emailForLog = 'unknown';
    try {
        const body = await request.json();
        const { email, password } = body;
        emailForLog = email || 'unknown';

        console.log(`[Auth] Login attempt for email: ${email}`);

        if (!email || !password) {
            console.log(`[Auth] Missing credentials - email: ${!!email}, password: ${!!password}`);
            return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
        }

        const user = await getStaffByEmail(email);
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

        console.log(`[Auth] User lookup result: ${user ? 'found' : 'not found'}, IP: ${ip}`);

        if (!user) {
            await addActivityLog(null, 'LOGIN_FAILED', `Login attempt with non-existent email: ${email}`, email, { ip, reason: 'user_not_found' });
            console.log(`[Auth] 401 - User not found: ${email}`);
            return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
        }

        if (user.status === 'Inactive') {
            await addActivityLog(Number(user.id), 'LOGIN_FAILED', `Login attempt for inactive account: ${email}`, email, { ip, reason: 'account_inactive' });
            console.log(`[Auth] 403 - Account inactive: ${email}`);
            return NextResponse.json({
                message: 'Account is deactivated. contact your Supervisor or Manager.'
            }, { status: 403 });
        }

        const isCorrectPassword = await verifyPassword(email, password);
        console.log(`[Auth] Password verification: ${isCorrectPassword ? 'success' : 'failed'}`);

        if (!isCorrectPassword) {
            await addActivityLog(Number(user.id), 'LOGIN_FAILED', `Invalid password attempt for: ${email}`, email, { ip, reason: 'invalid_password' });
            console.log(`[Auth] 401 - Invalid password for: ${email}`);
            return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
        }

        await addActivityLog(Number(user.id), 'LOGIN_SUCCESS', `User logged in: ${email}`, 'SYSTEM', { ip });
        console.log(`[Auth] Login successful for: ${email}`);

        const { ...userWithoutPassword } = user;
        return NextResponse.json(userWithoutPassword);

    } catch (error: any) {
        console.error('[Auth] Login Error:', error);
        return NextResponse.json({ message: 'Login failed', error: error.message }, { status: 500 });
    }
}

async function handleVerifyPassword(request: Request) {
    try {
        const { email, password } = await request.json();
        if (!email || !password) {
            return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
        }

        const isCorrectPassword = await verifyPassword(email, password);

        return NextResponse.json({ success: isCorrectPassword });

    } catch (error: any) {
        return NextResponse.json({ message: 'Verification failed', error: error.message, success: false }, { status: 500 });
    }
}


async function handlePasswordReset(request: Request) {
    try {
        const { email, newPassword, changerEmail } = await request.json();
        if (!email || !newPassword) {
            return NextResponse.json({ message: 'Email and new password are required' }, { status: 400 });
        }

        const user = await getStaffByEmail(email);
        const changer = changerEmail ? await getStaffByEmail(changerEmail) : null;

        // If an admin (changer) is resetting, force the user to change password on next login
        const forceChange = !!changerEmail;
        await dbUpdatePassword(email, newPassword, forceChange);

        const updatedUser = await getStaffByEmail(email);
        if (!updatedUser) {
            return NextResponse.json({ message: 'User not found after password update' }, { status: 404 });
        }

        await addActivityLog(
            changer ? Number(changer.id) : Number(user?.id),
            'PASSWORD_RESET',
            changerEmail ? `Admin reset password for: ${email}` : `User reset their own password: ${email}`,
            email
        );

        return NextResponse.json(updatedUser);

    } catch (error: any) {
        return NextResponse.json({ message: 'Password reset failed', error: error.message }, { status: 500 });
    }
}


export async function POST(
    request: Request,
    context: { params: { action: string[] } }
) {
    // Await params if they are a Promise (Next.js app router)
    const params = context.params instanceof Promise ? await context.params : context.params;
    const action = params.action[0];

    switch (action) {
        case 'login':
            return handleLogin(request);
        case 'reset-password':
            return handlePasswordReset(request);
        case 'verify-password':
            return handleVerifyPassword(request);
        default:
            return NextResponse.json({ message: 'Not Found' }, { status: 404 });
    }
}
