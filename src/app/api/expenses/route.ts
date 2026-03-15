import { NextRequest, NextResponse } from "next/server";
import { addExpense, getExpenses, updateExpense, deleteExpense } from "@/lib/db/expenses";
import { syncAllTransactions } from "@/lib/accounting/automation";

export async function GET() {
  try {
    const expenses = await getExpenses();
    return NextResponse.json(expenses);
  } catch (error) {
    // console.error("Failed to get expenses:", error); // Removed console.error
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) { // Changed Request to NextRequest
  try {
    const data = await request.json();
    const expense = await addExpense(data); // Changed createExpense to addExpense
    
    // Auto-sync to accounting
    try {
      await syncAllTransactions();
    } catch (syncError) {
      console.error("Failed to auto-sync accounting after expense:", syncError);
    }

    return NextResponse.json(expense, { status: 201 }); // Added status 201
  } catch (error: any) { // Changed error type and removed console.error
    // console.error("Failed to create expense:", error); // Removed console.error
    return NextResponse.json({ error: error.message }, { status: 500 }); // Changed error response
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "0");
    const data = await request.json();
    const expense = await updateExpense(id, data);
    return NextResponse.json(expense);
  } catch (error) {
    console.error("Failed to update expense:", error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "0");
    await deleteExpense(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete expense:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
