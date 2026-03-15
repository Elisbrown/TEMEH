// src/app/api/payroll/salaries/route.ts
import { NextResponse } from "next/server";
import { getSalaries, setSalary, updateSalary, deleteSalary } from "@/lib/db/payroll";

export async function GET() {
  try {
    const salaries = await getSalaries();
    return NextResponse.json(salaries);
  } catch (error) {
    console.error("Failed to get salaries:", error);
    return NextResponse.json({ error: "Failed to fetch salaries" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const salary = await setSalary(data);
    return NextResponse.json(salary);
  } catch (error) {
    console.error("Failed to set salary:", error);
    return NextResponse.json({ error: "Failed to set salary" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...data } = await request.json();
    await updateSalary(id, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update salary:", error);
    return NextResponse.json({ error: "Failed to update salary" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await deleteSalary(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete salary:", error);
    return NextResponse.json({ error: "Failed to delete salary" }, { status: 500 });
  }
}
