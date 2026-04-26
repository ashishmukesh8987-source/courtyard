import { NextRequest, NextResponse } from "next/server";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAdminDb() {
  if (getApps().length === 0) {
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
  return getFirestore();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  if (!orderId || typeof orderId !== "string" || orderId.length > 50) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const doc = await db.collection("orders").doc(orderId).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const data = doc.data()!;

    // Only return non-sensitive data for public tracking
    return NextResponse.json({
      id: doc.id,
      shopName: data.shopName,
      status: data.status,
      items: data.items.map((i: { name: string; quantity: number; price: number }) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      })),
      total: data.total,
      tableNumber: data.tableNumber,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to fetch order:", err);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}
