import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.split("Bearer ")[1];
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let uid: string;
    try {
      const decoded = await getAdminAuth().verifyIdToken(token);
      uid = decoded.uid;
    } catch (authErr) {
      console.error("Token verification failed:", authErr);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const db = getAdminDb();

    // Simple query without composite index requirement
    const snap = await db
      .collection("orders")
      .where("customerUid", "==", uid)
      .limit(50)
      .get();

    const orders = snap.docs
      .map((d) => {
        const data = d.data();
        const createdAt = data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString();
        return {
          id: d.id,
          shopName: data.shopName,
          status: data.status,
          total: data.total,
          items: data.items,
          tableNumber: data.tableNumber,
          createdAt,
        };
      })
      // Sort client-side instead of requiring composite index
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);

    return NextResponse.json({ orders });
  } catch (err) {
    console.error("my-orders error:", err);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
