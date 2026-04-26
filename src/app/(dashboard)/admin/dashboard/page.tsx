"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getAllShopsByCourtyard, onOrdersForShop } from "@/lib/firestore";
import type { Shop, Order } from "@/types";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import { LogOut, Store, ShoppingBag, Shield } from "lucide-react";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { appUser, loading: authLoading, signOut } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!appUser || appUser.role !== "admin" || !appUser.courtyardId) {
      router.push("/admin/login");
      return;
    }
    loadData();
  }, [appUser, authLoading, router]);

  async function loadData() {
    if (!appUser?.courtyardId) return;
    const shopList = await getAllShopsByCourtyard(appUser.courtyardId);
    setShops(shopList);

    // Get today's orders for stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const q = query(
      collection(db, "orders"),
      where("courtyardId", "==", appUser.courtyardId),
      where("createdAt", ">=", Timestamp.fromDate(today))
    );
    const snap = await getDocs(q);
    setOrderCount(snap.size);
    let rev = 0;
    snap.docs.forEach((d) => {
      const data = d.data();
      if (data.status !== "cancelled") rev += data.total || 0;
    });
    setTodayRevenue(rev);
    setLoading(false);
  }

  if (authLoading || loading) return <Spinner className="min-h-screen" />;

  const activeShops = shops.filter((s) => s.isActive).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-700" /> Admin Dashboard
          </h1>
          <button
            onClick={() => { signOut(); router.push("/admin/login"); }}
            className="text-gray-400 hover:text-gray-600"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <Store className="w-6 h-6 mx-auto text-orange-600 mb-1" />
            <p className="text-2xl font-bold text-gray-900">{activeShops}/{shops.length}</p>
            <p className="text-xs text-gray-500">Active Shops</p>
          </Card>
          <Card className="p-4 text-center">
            <ShoppingBag className="w-6 h-6 mx-auto text-blue-600 mb-1" />
            <p className="text-2xl font-bold text-gray-900">{orderCount}</p>
            <p className="text-xs text-gray-500">Today&apos;s Orders</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-sm text-gray-400 mb-1">₹</p>
            <p className="text-2xl font-bold text-gray-900">₹{todayRevenue}</p>
            <p className="text-xs text-gray-500">Today&apos;s Revenue</p>
          </Card>
        </div>

        {/* Quick Links */}
        <div>
          <Link href="/admin/shops">
            <Card className="p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Store className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Manage Shops</p>
                  <p className="text-sm text-gray-500">{shops.length} shops registered</p>
                </div>
              </div>
              <span className="text-gray-400">→</span>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
