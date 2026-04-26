import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

// POST: create a waiter call
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shopId, courtyardId, tableNumber } = body;

    if (!shopId || typeof shopId !== "string") {
      return NextResponse.json({ error: "Invalid shop" }, { status: 400 });
    }
    if (!tableNumber || typeof tableNumber !== "string" || tableNumber.trim().length < 1) {
      return NextResponse.json({ error: "Table number required" }, { status: 400 });
    }

    const db = getAdminDb();

    // Check shop exists
    const shopDoc = await db.collection("shops").doc(shopId).get();
    if (!shopDoc.exists) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    await db.collection("waiterCalls").add({
      shopId,
      courtyardId: courtyardId || "",
      tableNumber: tableNumber.trim(),
      status: "pending", // pending | acknowledged
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Waiter call failed:", err);
    return NextResponse.json({ error: "Failed to call waiter" }, { status: 500 });
  }
}
