import { NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "./firebase-admin";

export interface VerifiedUser {
  uid: string;
  email: string;
  role: "admin" | "shop_owner";
  courtyardId?: string;
  shopId?: string;
}

/**
 * Verify Firebase auth token from request and return user profile.
 * Returns null if unauthorized.
 */
export async function verifyAuth(req: NextRequest): Promise<VerifiedUser | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split("Bearer ")[1];
  if (!token) return null;

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const userDoc = await getAdminDb().collection("users").doc(decoded.uid).get();
    if (!userDoc.exists) return null;

    const data = userDoc.data()!;
    return {
      uid: decoded.uid,
      email: data.email || decoded.email || "",
      role: data.role,
      courtyardId: data.courtyardId,
      shopId: data.shopId,
    };
  } catch {
    return null;
  }
}

/**
 * Verify that user is an admin
 */
export async function verifyAdmin(req: NextRequest): Promise<VerifiedUser | null> {
  const user = await verifyAuth(req);
  if (!user || user.role !== "admin") return null;
  return user;
}

/**
 * Verify that user is a shop owner
 */
export async function verifyShopOwner(req: NextRequest): Promise<VerifiedUser | null> {
  const user = await verifyAuth(req);
  if (!user || user.role !== "shop_owner") return null;
  return user;
}
