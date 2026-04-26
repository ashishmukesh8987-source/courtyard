import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin (server-side only)
function getAdminDb() {
  if (getApps().length === 0) {
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
  return getFirestore();
}

interface OrderItem {
  itemId: string;
  quantity: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shopId, courtyardId, customerName, customerPhone, tableNumber, items } = body;

    // Input validation
    if (!shopId || typeof shopId !== "string") {
      return NextResponse.json({ error: "Invalid shop" }, { status: 400 });
    }
    if (!courtyardId || typeof courtyardId !== "string") {
      return NextResponse.json({ error: "Invalid courtyard" }, { status: 400 });
    }
    if (!customerName || typeof customerName !== "string" || customerName.trim().length < 1 || customerName.trim().length > 100) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    if (!customerPhone || typeof customerPhone !== "string" || !/^\d{10,15}$/.test(customerPhone.replace(/\D/g, ""))) {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }
    if (!tableNumber || typeof tableNumber !== "string" || tableNumber.trim().length < 1 || tableNumber.trim().length > 20) {
      return NextResponse.json({ error: "Invalid table number" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return NextResponse.json({ error: "Invalid items" }, { status: 400 });
    }

    const db = getAdminDb();

    // Verify shop exists and is active
    const shopDoc = await db.collection("shops").doc(shopId).get();
    if (!shopDoc.exists || !shopDoc.data()?.isActive) {
      return NextResponse.json({ error: "Shop not found or inactive" }, { status: 404 });
    }
    const shopName = shopDoc.data()?.name || "Unknown Shop";

    // Validate each item and calculate total server-side
    let calculatedTotal = 0;
    const validatedItems: Array<{ itemId: string; name: string; price: number; quantity: number }> = [];

    for (const item of items as OrderItem[]) {
      if (!item.itemId || typeof item.itemId !== "string") {
        return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
      }
      if (!item.quantity || typeof item.quantity !== "number" || item.quantity < 1 || item.quantity > 99 || !Number.isInteger(item.quantity)) {
        return NextResponse.json({ error: `Invalid quantity for item` }, { status: 400 });
      }

      const menuItemDoc = await db.collection("menuItems").doc(item.itemId).get();
      if (!menuItemDoc.exists) {
        return NextResponse.json({ error: `Menu item not found: ${item.itemId}` }, { status: 404 });
      }

      const menuItem = menuItemDoc.data()!;

      // Verify item belongs to this shop and is available
      if (menuItem.shopId !== shopId) {
        return NextResponse.json({ error: "Item does not belong to this shop" }, { status: 400 });
      }
      if (!menuItem.isAvailable) {
        return NextResponse.json({ error: `${menuItem.name} is no longer available` }, { status: 400 });
      }

      const serverPrice = menuItem.price;
      calculatedTotal += serverPrice * item.quantity;

      validatedItems.push({
        itemId: item.itemId,
        name: menuItem.name,
        price: serverPrice,
        quantity: item.quantity,
      });
    }

    // Create order with server-validated data
    const orderData = {
      shopId,
      shopName,
      courtyardId,
      tableNumber: tableNumber.trim(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim().replace(/\D/g, ""),
      items: validatedItems,
      total: calculatedTotal,
      status: "pending" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const orderRef = await db.collection("orders").add(orderData);

    return NextResponse.json({
      orderId: orderRef.id,
      total: calculatedTotal,
    });
  } catch (err) {
    console.error("Order creation failed:", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
