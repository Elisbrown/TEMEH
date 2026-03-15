// src/app/api/payroll/advances/route.ts
import { NextResponse } from "next/server";
import {
  getAdvances,
  createAdvance,
  updateAdvance,
  updateAdvanceStatus,
  deleteAdvance,
} from "@/lib/db/payroll";
import { syncAllTransactions } from "@/lib/accounting/automation";

export async function GET() {
  try {
    const advances = await getAdvances();
    return NextResponse.json(advances);
  } catch (error) {
    console.error("Failed to get advances:", error);
    return NextResponse.json({ error: "Failed to fetch advances" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const advance = await createAdvance(data);
    
    // Auto-sync to accounting
    try {
      await syncAllTransactions();
    } catch (syncError) {
      console.error("Failed to auto-sync accounting after advance:", syncError);
    }

    return NextResponse.json(advance);
  } catch (error) {
    console.error("Failed to create advance:", error);
    return NextResponse.json({ error: "Failed to create advance" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json();
    const result = await updateAdvanceStatus(id, status);
    
    // Auto-sync if approved
    if (status === 'approved' || status === 'repaid') {
        try {
          await syncAllTransactions();
        } catch (syncError) {
          console.error("Failed to auto-sync accounting after advance status update:", syncError);
        }
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Failed to update advance status:", error);
    return NextResponse.json({ error: "Failed to update advance status" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...data } = await request.json();
    await updateAdvance(id, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update advance:", error);
    return NextResponse.json({ error: "Failed to update advance" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await deleteAdvance(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete advance:", error);
    return NextResponse.json({ error: "Failed to delete advance" }, { status: 500 });
  }
}
