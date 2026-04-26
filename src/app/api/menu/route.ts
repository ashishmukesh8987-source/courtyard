import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyShopOwner } from "@/lib/api-auth";

// GET: fetch menu items for the authenticated shop owner's shop
export async function GET(req: NextRequest) {
  const user = await verifyShopOwner(req);
  if (!user || !user.shopId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const snap = await db.collection("menuItems").where("shopId", "==", user.shopId).get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ items });
  } catch (err) {
    console.error("Failed to fetch menu:", err);
    return NextResponse.json({ error: "Failed to fetch menu" }, { status: 500 });
  }
}

// POST: create a new menu item
export async function POST(req: NextRequest) {
  const user = await verifyShopOwner(req);
  if (!user || !user.shopId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, price, category, description } = body;

    if (!name || typeof name !== "string" || name.trim().length < 1) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!price || typeof price !== "number" || price <= 0) {
      return NextResponse.json({ error: "Valid price is required" }, { status: 400 });
    }

    const db = getAdminDb();
    const ref = await db.collection("menuItems").add({
      shopId: user.shopId,
      courtyardId: user.courtyardId || "",
      name: name.trim(),
      price,
      category: (category || "General").trim(),
      description: (description || "").trim(),
      imageUrl: "",
      isAvailable: true,
      createdAt: new Date(),
    });

    return NextResponse.json({ id: ref.id });
  } catch (err) {
    console.error("Failed to create menu item:", err);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}

// PUT: update a menu item
export async function PUT(req: NextRequest) {
  const user = await verifyShopOwner(req);
  if (!user || !user.shopId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const db = getAdminDb();
    const itemDoc = await db.collection("menuItems").doc(id).get();
    if (!itemDoc.exists) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Verify ownership
    if (itemDoc.data()?.shopId !== user.shopId) {
      return NextResponse.json({ error: "Not your item" }, { status: 403 });
    }

    // Only allow safe fields to be updated
    const allowed: Record<string, unknown> = {};
    if (updates.name !== undefined) allowed.name = String(updates.name).trim();
    if (updates.price !== undefined) allowed.price = Number(updates.price);
    if (updates.category !== undefined) allowed.category = String(updates.category).trim();
    if (updates.description !== undefined) allowed.description = String(updates.description).trim();
    if (updates.isAvailable !== undefined) allowed.isAvailable = Boolean(updates.isAvailable);

    await db.collection("menuItems").doc(id).update(allowed);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to update menu item:", err);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

// DELETE: delete a menu item
export async function DELETE(req: NextRequest) {
  const user = await verifyShopOwner(req);
  if (!user || !user.shopId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const db = getAdminDb();
    const itemDoc = await db.collection("menuItems").doc(id).get();
    if (!itemDoc.exists) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Verify ownership
    if (itemDoc.data()?.shopId !== user.shopId) {
      return NextResponse.json({ error: "Not your item" }, { status: 403 });
    }

    await db.collection("menuItems").doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete menu item:", err);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
