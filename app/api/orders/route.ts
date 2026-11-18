
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    return NextResponse.json(
      { error: "Server configuration is missing." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { customerName, customerEmail, customerAddress, items } = body;

    if (
      typeof customerName !== "string" ||
      !customerName.trim() ||
      typeof customerEmail !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) ||
      typeof customerAddress !== "string" ||
      !customerAddress.trim() ||
      !Array.isArray(items) ||
      items.length === 0 ||
      items.length > 50
    ) {
      return NextResponse.json(
        { error: "Please check your customer details and cart." },
        { status: 400 }
      );
    }

    const quantities = new Map<number, number>();

    for (const item of items) {
      if (
        !Number.isSafeInteger(item.id) ||
        item.id <= 0 ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > 100
      ) {
        return NextResponse.json(
          { error: "Invalid product or quantity." },
          { status: 400 }
        );
      }

      quantities.set(
        item.id,
        (quantities.get(item.id) ?? 0) + item.quantity
      );
    }

    const supabase = createClient(url, secretKey);
    const ids = [...quantities.keys()];

    const { data: products, error: productError } = await supabase
      .from("products")
      .select("id, name, price, stock")
      .in("id", ids);

    if (productError || !products || products.length !== ids.length) {
      return NextResponse.json(
        { error: "Could not verify the cart products." },
        { status: 400 }
      );
    }

    let total = 0;
    const orderItems = [];

    for (const product of products) {
      const quantity = quantities.get(product.id)!;
      const price = Number(product.price);

      if (
        !Number.isFinite(price) ||
        price < 0 ||
        !Number.isSafeInteger(product.stock) ||
        product.stock < quantity
      ) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}.` },
          { status: 400 }
        );
      }

      total += price * quantity;
      orderItems.push({
        id: product.id,
        name: product.name,
        price,
        quantity,
      });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        customer_address: customerAddress.trim(),
        items: orderItems,
        total_amount: total,
        status: "Pending",
      })
      .select("id")
      .single();

    if (orderError) {
      console.error("Order insert failed:", orderError.message);
      return NextResponse.json(
        { error: "Could not save the order." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, orderId: order.id });
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}
