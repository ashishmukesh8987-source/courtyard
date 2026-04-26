import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  // Verify admin auth
  const admin = await verifyAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { shopName, shopDesc, ownerEmail, ownerPassword, courtyardId, courtyardSlug } = body;

    if (!shopName || !ownerEmail || !ownerPassword || !courtyardId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (ownerPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();

    // Verify this courtyard belongs to the admin
    const courtyardDoc = await adminDb.collection("courtyards").doc(courtyardId).get();
    if (!courtyardDoc.exists || courtyardDoc.data()?.adminUid !== admin.uid) {
      return NextResponse.json({ error: "Courtyard not found or not yours" }, { status: 403 });
    }

    // Create Firebase Auth account for shop owner
    let ownerUser;
    try {
      ownerUser = await adminAuth.createUser({
        email: ownerEmail.trim(),
        password: ownerPassword,
        displayName: shopName.trim() + " Owner",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("email-already-exists")) {
        return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
      }
      return NextResponse.json({ error: "Failed to create owner account" }, { status: 500 });
    }

    // Create slug
    const slug = shopName.trim().toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-");

    // Create shop document
    const shopRef = await adminDb.collection("shops").add({
      courtyardId,
      courtyardSlug: courtyardSlug || courtyardDoc.data()?.slug || "",
      name: shopName.trim(),
      slug,
      description: (shopDesc || "").trim(),
      imageUrl: "",
      ownerUid: ownerUser.uid,
      ownerEmail: ownerEmail.trim(),
      isActive: true,
      createdAt: new Date(),
    });

    // Create user profile for shop owner
    await adminDb.collection("users").doc(ownerUser.uid).set({
      email: ownerEmail.trim(),
      displayName: shopName.trim() + " Owner",
      role: "shop_owner",
      courtyardId,
      shopId: shopRef.id,
    });

    return NextResponse.json({
      shopId: shopRef.id,
      ownerUid: ownerUser.uid,
    });
  } catch (err) {
    console.error("Shop creation failed:", err);
    return NextResponse.json({ error: "Failed to create shop" }, { status: 500 });
  }
}
