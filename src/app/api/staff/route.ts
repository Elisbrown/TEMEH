// src/app/api/staff/route.ts
import { NextResponse } from "next/server";
import {
  getStaff,
  addStaff,
  updateStaff,
  deleteStaff,
  getStaffByEmail,
} from "@/lib/db/staff";
import { addActivityLog } from "@/lib/db/activity-logs";

export const runtime = "nodejs";

async function getActorId(email?: string) {
    if (!email || email === "system") return null;
    const user = await getStaffByEmail(email);
    return user ? Number(user.id) : null;
}

export async function GET(request: Request) {
  try {
    const staffList = await getStaff();
    return NextResponse.json(staffList);
  } catch (error: any) {
    return NextResponse.json(
      { message: "Failed to fetch staff", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const actorId = await getActorId(data.userEmail);
    
    // Check for bulk actions
    if (data.action === 'bulk_delete') {
      const { emails } = data;
      for (const email of emails) {
        await deleteStaff(email);
      }
      
      await addActivityLog(
        actorId, 
        "STAFF_BULK_DELETE", 
        `Bulk deleted ${emails.length} staff members`, 
        "STAFF_SYSTEM", 
        { emails }
      );
      
      return NextResponse.json({ message: "Staff members deleted successfully" });
    }

    if (data.action === 'bulk_update_status') {
        const { emails, status } = data;
        for (const email of emails) {
            await updateStaff(email, { status });
        }

        await addActivityLog(
            actorId, 
            "STAFF_BULK_STATUS_UPDATE", 
            `Bulk updated status to ${status} for ${emails.length} staff members`, 
            "STAFF_SYSTEM", 
            { emails, status }
        );

        return NextResponse.json({ message: "Staff members updated successfully" });
    }

    // Normal add staff
    const newStaffMember = await addStaff(data);

    await addActivityLog(
      actorId,
      "STAFF_CREATE",
      `Added new staff member: ${newStaffMember.name}`,
      newStaffMember.email,
      { role: newStaffMember.role, floor: newStaffMember.floor }
    );

    return NextResponse.json(newStaffMember, { status: 201 });
  } catch (error: any) {
    console.error("Staff POST API Error:", error);
    return NextResponse.json(
      { message: "Failed to process staff request", error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    if (!email) {
      return NextResponse.json({ message: "Email query parameter is required" }, { status: 400 });
    }
    const staffData = await request.json();
    const oldStaff = await getStaffByEmail(email);
    const updatedStaffMember = await updateStaff(email, staffData);
    const actorId = await getActorId(staffData.userEmail);

    await addActivityLog(
      actorId,
      "STAFF_UPDATE",
      `Updated staff member: ${updatedStaffMember.name}`,
      email,
      { 
        changes: {
          role: oldStaff?.role !== updatedStaffMember.role ? { old: oldStaff?.role, new: updatedStaffMember.role } : undefined,
          status: oldStaff?.status !== updatedStaffMember.status ? { old: oldStaff?.status, new: updatedStaffMember.status } : undefined,
          floor: oldStaff?.floor !== updatedStaffMember.floor ? { old: oldStaff?.floor, new: updatedStaffMember.floor } : undefined,
          password_reset: oldStaff?.force_password_change !== updatedStaffMember.force_password_change && updatedStaffMember.force_password_change === 1 ? true : undefined,
        }
      }
    );

    return NextResponse.json(updatedStaffMember);
  } catch (error: any) {
    console.error("Staff PUT Error:", error);
    return NextResponse.json(
      { message: "Failed to update staff member", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const userEmail = searchParams.get("userEmail"); // Current user performing deletion
    
    if (!email) {
      return NextResponse.json({ message: "Email query parameter is required" }, { status: 400 });
    }

    const staffMember = await getStaffByEmail(email);
    const actorId = await getActorId(userEmail || undefined);

    await deleteStaff(email);

    await addActivityLog(
      actorId,
      "STAFF_DELETE",
      `Deleted staff member: ${staffMember?.name || "Unknown"}`,
      email
    );

    return NextResponse.json({ message: "Staff member deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { message: "Failed to delete staff member", error: error.message },
      { status: 500 }
    );
  }
}
