import { NextRequest, NextResponse } from "next/server";

// NOTE: For full production, use Firebase Admin SDK here.
// This is a placeholder API route that documents the approach.
// For the MVP, shop owner creation is handled client-side.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shopName, ownerEmail, ownerPassword, courtyardId, shopId } = body;

    if (!shopName || !ownerEmail || !ownerPassword || !courtyardId || !shopId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // In production:
    // 1. Verify the requesting user is an admin (check auth token)
    // 2. Use Firebase Admin SDK to create user: admin.auth().createUser(...)
    // 3. Set custom claims or create users doc
    // 4. Return the new user UID

    // For now, return instructions
    return NextResponse.json({
      message: "Shop owner account should be created via Firebase Console or Admin SDK",
      shopId,
      ownerEmail,
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
