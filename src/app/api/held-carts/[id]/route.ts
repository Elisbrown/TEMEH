
import { NextRequest, NextResponse } from "next/server";
import { deleteHeldCart, getHeldCartById } from "@/lib/db/held-carts";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
    }

    const result = await deleteHeldCart(id);
    return NextResponse.json({ message: "Cart deleted", id, result });
  } catch (error) {
    console.error("Error deleting held cart:", error);
    return NextResponse.json({ message: "Failed to delete cart" }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = parseInt(idParam);
        if (isNaN(id)) {
            return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
        }
        const cart = await getHeldCartById(id);
        if(!cart) {
            return NextResponse.json({ message: "Cart not found" }, { status: 404 });
        }
        return NextResponse.json(cart);
    } catch (error) {
        console.error("Error getting held cart:", error);
        return NextResponse.json({ message: "Failed to get cart" }, { status: 500 });
    }
}
