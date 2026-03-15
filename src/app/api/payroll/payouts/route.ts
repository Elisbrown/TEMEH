// src/app/api/payroll/payouts/route.ts
import { NextResponse } from "next/server";
import { getPayouts, createPayout, updatePayout, deletePayout } from "@/lib/db/payroll";
import { syncAllTransactions } from "@/lib/accounting/automation";

export async function GET() {
  try {
    const payouts = await getPayouts();
    return NextResponse.json(payouts);
  } catch (error) {
    console.error("Failed to get payouts:", error);
    return NextResponse.json({ error: "Failed to fetch payouts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const payout = await createPayout(data);
    
    // Auto-sync to accounting
    try {
      await syncAllTransactions();
    } catch (syncError) {
      console.error("Failed to auto-sync accounting after payout:", syncError);
    }

    return NextResponse.json(payout);
  } catch (error) {
    console.error("Failed to create payout:", error);
    return NextResponse.json({ error: "Failed to create payout" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...data } = await request.json();
    await updatePayout(id, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update payout:", error);
    return NextResponse.json({ error: "Failed to update payout" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await deletePayout(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete payout:", error);
    return NextResponse.json({ error: "Failed to delete payout" }, { status: 500 });
  }
}
