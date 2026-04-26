import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Courtyard, Shop, MenuItem, Order, AppUser } from "@/types";

// --- Helpers ---
function toDate(ts: unknown): Date {
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date();
}

// --- Courtyards ---
export async function getCourtyards(): Promise<Courtyard[]> {
  const snap = await getDocs(collection(db, "courtyards"));
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
  })) as Courtyard[];
}

export async function getCourtyardBySlug(slug: string): Promise<Courtyard | null> {
  const q = query(collection(db, "courtyards"), where("slug", "==", slug));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data(), createdAt: toDate(d.data().createdAt) } as Courtyard;
}

export async function createCourtyard(data: Omit<Courtyard, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "courtyards"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getCourtyardsByAdmin(adminUid: string): Promise<Courtyard[]> {
  const q = query(collection(db, "courtyards"), where("adminUid", "==", adminUid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
  })) as Courtyard[];
}

export async function updateCourtyard(id: string, data: Partial<Courtyard>): Promise<void> {
  await updateDoc(doc(db, "courtyards", id), data);
}

// --- Shops ---
export async function getShopsByCourtyard(courtyardId: string): Promise<Shop[]> {
  const q = query(
    collection(db, "shops"),
    where("courtyardId", "==", courtyardId),
    where("isActive", "==", true)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
  })) as Shop[];
}

export async function getAllShopsByCourtyard(courtyardId: string): Promise<Shop[]> {
  const q = query(collection(db, "shops"), where("courtyardId", "==", courtyardId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
  })) as Shop[];
}

export async function getShopBySlug(courtyardId: string, slug: string): Promise<Shop | null> {
  const q = query(
    collection(db, "shops"),
    where("courtyardId", "==", courtyardId),
    where("slug", "==", slug)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data(), createdAt: toDate(d.data().createdAt) } as Shop;
}

export async function getShopById(shopId: string): Promise<Shop | null> {
  const d = await getDoc(doc(db, "shops", shopId));
  if (!d.exists()) return null;
  return { id: d.id, ...d.data(), createdAt: toDate(d.data().createdAt) } as Shop;
}

export async function createShop(data: Omit<Shop, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "shops"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateShop(id: string, data: Partial<Shop>): Promise<void> {
  await updateDoc(doc(db, "shops", id), data);
}

export async function deleteShop(id: string): Promise<void> {
  await deleteDoc(doc(db, "shops", id));
}

// --- Menu Items ---
export async function getMenuItemsByShop(shopId: string): Promise<MenuItem[]> {
  const q = query(collection(db, "menuItems"), where("shopId", "==", shopId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
  })) as MenuItem[];
}

export async function createMenuItem(data: Omit<MenuItem, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "menuItems"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateMenuItem(id: string, data: Partial<MenuItem>): Promise<void> {
  await updateDoc(doc(db, "menuItems", id), data);
}

export async function deleteMenuItem(id: string): Promise<void> {
  await deleteDoc(doc(db, "menuItems", id));
}

// --- Orders ---
export async function createOrder(data: Omit<Order, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const ref = await addDoc(collection(db, "orders"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateOrderStatus(orderId: string, status: Order["status"]): Promise<void> {
  await updateDoc(doc(db, "orders", orderId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function getOrder(orderId: string): Promise<Order | null> {
  const d = await getDoc(doc(db, "orders", orderId));
  if (!d.exists()) return null;
  return {
    id: d.id,
    ...d.data(),
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  } as Order;
}

export function onOrdersForShop(
  shopId: string,
  callback: (orders: Order[]) => void
) {
  const q = query(
    collection(db, "orders"),
    where("shopId", "==", shopId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    const orders = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: toDate(d.data().createdAt),
      updatedAt: toDate(d.data().updatedAt),
    })) as Order[];
    callback(orders);
  });
}

export function onOrderById(orderId: string, callback: (order: Order | null) => void) {
  return onSnapshot(doc(db, "orders", orderId), (d) => {
    if (!d.exists()) {
      callback(null);
      return;
    }
    callback({
      id: d.id,
      ...d.data(),
      createdAt: toDate(d.data().createdAt),
      updatedAt: toDate(d.data().updatedAt),
    } as Order);
  });
}

// --- Waiter Calls ---
export interface WaiterCall {
  id: string;
  shopId: string;
  courtyardId: string;
  tableNumber: string;
  status: "pending" | "acknowledged";
  createdAt: Date;
}

export function onWaiterCallsForShop(
  shopId: string,
  callback: (calls: WaiterCall[]) => void
) {
  const q = query(
    collection(db, "waiterCalls"),
    where("shopId", "==", shopId),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    const calls = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: toDate(d.data().createdAt),
    })) as WaiterCall[];
    callback(calls);
  });
}

export async function acknowledgeWaiterCall(callId: string): Promise<void> {
  await updateDoc(doc(db, "waiterCalls", callId), {
    status: "acknowledged",
  });
}

// --- Users ---
export async function getAppUser(uid: string): Promise<AppUser | null> {
  const d = await getDoc(doc(db, "users", uid));
  if (!d.exists()) return null;
  return { uid: d.id, ...d.data() } as AppUser;
}

export async function findPendingUserByEmail(email: string): Promise<{ docId: string; data: Omit<AppUser, "uid"> } | null> {
  const q = query(collection(db, "users"), where("email", "==", email));
  const snap = await getDocs(q);
  // Look for a pending doc (id starts with "pending_")
  for (const d of snap.docs) {
    if (d.id.startsWith("pending_")) {
      const { ...data } = d.data();
      return { docId: d.id, data: data as Omit<AppUser, "uid"> };
    }
  }
  return null;
}

export async function claimPendingUser(pendingDocId: string, actualUid: string, shopId: string): Promise<void> {
  const pendingRef = doc(db, "users", pendingDocId);
  const pendingDoc = await getDoc(pendingRef);
  if (!pendingDoc.exists()) return;

  const data = pendingDoc.data();

  // Create proper user doc under the real UID
  const { setDoc: fsSetDoc } = await import("firebase/firestore");
  await fsSetDoc(doc(db, "users", actualUid), data);

  // Update shop with the real owner UID
  await updateDoc(doc(db, "shops", shopId), { ownerUid: actualUid });

  // Delete the pending doc
  await deleteDoc(pendingRef);
}

export async function createAppUser(user: AppUser): Promise<void> {
  const { uid, ...data } = user;
  await updateDoc(doc(db, "users", uid), data).catch(() =>
    addDoc(collection(db, "users"), { ...data }).then(() => {})
  );
}

export async function setAppUser(uid: string, data: Omit<AppUser, "uid">): Promise<void> {
  const { ...rest } = data;
  const ref = doc(db, "users", uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await updateDoc(ref, rest);
  } else {
    const { setDoc } = await import("firebase/firestore");
    await setDoc(ref, rest);
  }
}
