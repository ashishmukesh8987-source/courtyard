import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyShopOwner, verifyAdmin } from "@/lib/api-auth";

export async function PUT(req: NextRequest) {
  // Allow both shop owners and admins
  const shopOwner = await verifyShopOwner(req);
  const admin = !shopOwner ? await verifyAdmin(req) : null;
  const user = shopOwner || admin;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { orderId, status } = body;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const validStatuses = ["pending", "preparing", "ready", "completed", "cancelled"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const db = getAdminDb();
    const orderDoc = await db.collection("orders").doc(orderId).get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Shop owners can only update orders for their shop
    if (user.role === "shop_owner" && orderDoc.data()?.shopId !== user.shopId) {
      return NextResponse.json({ error: "Not your order" }, { status: 403 });
    }

    await db.collection("orders").doc(orderId).update({
      status,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to update order:", err);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
