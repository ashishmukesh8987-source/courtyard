import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

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
    const orderDoc = await db.collection("orders").doc(orderId).get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const data = orderDoc.data()!;

    function toISO(ts: unknown): string {
      if (ts instanceof Timestamp) return ts.toDate().toISOString();
      if (ts instanceof Date) return ts.toISOString();
      if (ts && typeof ts === "object" && "toDate" in ts) {
        return (ts as { toDate: () => Date }).toDate().toISOString();
      }
      return new Date().toISOString();
    }

    // Only return non-sensitive data for public tracking
    return NextResponse.json({
      id: orderDoc.id,
      shopName: data.shopName,
      status: data.status,
      items: data.items.map((i: { name: string; quantity: number; price: number }) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      })),
      total: data.total,
      tableNumber: data.tableNumber,
      createdAt: toISO(data.createdAt),
      updatedAt: toISO(data.updatedAt),
    });
  } catch (err) {
    console.error("Failed to fetch order:", err);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}
