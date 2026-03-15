import { NextRequest, NextResponse } from "next/server";
import path from 'path';
import { getHeldCarts, holdCart, HeldCart } from "@/lib/db/held-carts";

export async function GET() {
  try {
    const carts = await getHeldCarts();
    return NextResponse.json(carts);
  } catch (error) {
    console.error("Error fetching held carts:", error);
    return NextResponse.json({ message: "Failed to fetch held carts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { items, subtotal, tax_amount, discount_amount, total, cart_name, customer_name, customer_phone, notes, user_id } = data;

    if (!items || items.length === 0) {
      return NextResponse.json({ message: "Cart is empty" }, { status: 400 });
    }

    const heldCart = await holdCart({
      items,
      subtotal,
      tax_amount: tax_amount || 0,
      discount_amount: discount_amount || 0,
      total,
      cart_name,
      customer_name,
      customer_phone,
      notes,
      user_id
    });

    return NextResponse.json(heldCart);
  } catch (error) {
    console.error("Error holding cart:", error);
    return NextResponse.json({ message: "Failed to hold cart" }, { status: 500 });
  }
}
