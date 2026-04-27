"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { onOrdersForShop } from "@/lib/firestore";
import { formatPrice } from "@/lib/utils";
import type { Order } from "@/types";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import {
  ArrowLeft,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
} from "lucide-react";

export default function ShopInsightsPage() {
  const router = useRouter();
  const { appUser, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!appUser || appUser.role !== "shop_owner" || !appUser.shopId) {
      router.push("/shop/login");
      return;
    }
    const unsub = onOrdersForShop(appUser.shopId, (data) => {
      setOrders(data);
      setLoading(false);
    });
    return unsub;
  }, [appUser, authLoading, router]);

  if (authLoading || loading) return <Spinner className="min-h-screen" />;

  // Calculate insights
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  const todayOrders = orders.filter(
    (o) => new Date(o.createdAt) >= todayStart && o.status !== "cancelled"
  );
  const weekOrders = orders.filter(
    (o) => new Date(o.createdAt) >= weekStart && o.status !== "cancelled"
  );
  const allValidOrders = orders.filter((o) => o.status !== "cancelled");

  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const weekRevenue = weekOrders.reduce((sum, o) => sum + o.total, 0);
  const totalRevenue = allValidOrders.reduce((sum, o) => sum + o.total, 0);

  const avgOrderValue = allValidOrders.length > 0 ? totalRevenue / allValidOrders.length : 0;
  const completedCount = orders.filter((o) => o.status === "completed").length;
  const cancelledCount = orders.filter((o) => o.status === "cancelled").length;
  const pendingCount = orders.filter(
    (o) => ["pending", "preparing", "ready"].includes(o.status)
  ).length;

  // Top items
  const itemCounts: Record<string, { name: string; qty: number; revenue: number }> = {};
  allValidOrders.forEach((o) => {
    o.items.forEach((item) => {
      if (!itemCounts[item.name]) {
        itemCounts[item.name] = { name: item.name, qty: 0, revenue: 0 };
      }
      itemCounts[item.name].qty += item.quantity;
      itemCounts[item.name].revenue += item.price * item.quantity;
    });
  });
  const topItems = Object.values(itemCounts)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  // Hourly distribution (today)
  const hourlyOrders: Record<number, number> = {};
  todayOrders.forEach((o) => {
    const hour = new Date(o.createdAt).getHours();
    hourlyOrders[hour] = (hourlyOrders[hour] || 0) + 1;
  });
  const peakHour = Object.entries(hourlyOrders).sort(
    ([, a], [, b]) => b - a
  )[0];

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-charcoal sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center gap-3">
          <Link href="/shop/dashboard" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent-500" /> Insights
          </h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Today's Stats */}
        <div>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Today
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center">
              <ShoppingBag className="w-5 h-5 mx-auto text-fresh-500 mb-1" />
              <p className="text-2xl font-bold text-gray-900">{todayOrders.length}</p>
              <p className="text-xs text-gray-500">Orders</p>
            </Card>
            <Card className="p-4 text-center">
              <DollarSign className="w-5 h-5 mx-auto text-fresh-500 mb-1" />
              <p className="text-2xl font-bold text-gray-900">{formatPrice(todayRevenue)}</p>
              <p className="text-xs text-gray-500">Revenue</p>
            </Card>
            <Card className="p-4 text-center">
              <Clock className="w-5 h-5 mx-auto text-accent-500 mb-1" />
              <p className="text-2xl font-bold text-gray-900">
                {peakHour ? `${peakHour[0]}:00` : "—"}
              </p>
              <p className="text-xs text-gray-500">Peak Hour</p>
            </Card>
          </div>
        </div>

        {/* Weekly & All-Time */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <p className="text-xs text-gray-500 mb-1">This Week</p>
            <p className="text-lg font-bold text-gray-900">{formatPrice(weekRevenue)}</p>
            <p className="text-xs text-gray-400">{weekOrders.length} orders</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 mb-1">All Time</p>
            <p className="text-lg font-bold text-gray-900">{formatPrice(totalRevenue)}</p>
            <p className="text-xs text-gray-400">{allValidOrders.length} orders</p>
          </Card>
        </div>

        {/* Key Metrics */}
        <Card className="p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Key Metrics</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-fresh-500" />
              <div>
                <p className="text-gray-500">Avg. Order Value</p>
                <p className="font-semibold text-gray-900">{formatPrice(avgOrderValue)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-fresh-500" />
              <div>
                <p className="text-gray-500">Completed</p>
                <p className="font-semibold text-gray-900">{completedCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-mustard-500" />
              <div>
                <p className="text-gray-500">Active</p>
                <p className="font-semibold text-gray-900">{pendingCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-brand-500" />
              <div>
                <p className="text-gray-500">Cancelled</p>
                <p className="font-semibold text-gray-900">{cancelledCount}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Top Items */}
        {topItems.length > 0 && (
          <Card className="p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Top Selling Items</h2>
            <div className="space-y-2">
              {topItems.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-500 flex items-center justify-center text-xs font-semibold">
                      {idx + 1}
                    </span>
                    <span className="text-gray-900">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-500">{item.qty} sold</span>
                    <span className="text-gray-300 mx-2">·</span>
                    <span className="font-medium text-gray-900">{formatPrice(item.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Hourly Breakdown (today) */}
        {Object.keys(hourlyOrders).length > 0 && (
          <Card className="p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Today&apos;s Hourly Orders</h2>
            <div className="flex items-end gap-1 h-24">
              {Array.from({ length: 24 }, (_, h) => {
                const count = hourlyOrders[h] || 0;
                const maxCount = Math.max(...Object.values(hourlyOrders), 1);
                const height = count > 0 ? Math.max((count / maxCount) * 100, 8) : 0;
                return (
                  <div key={h} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-accent-500 rounded-sm transition-all"
                      style={{ height: `${height}%` }}
                      title={`${h}:00 — ${count} orders`}
                    />
                    {h % 4 === 0 && (
                      <span className="text-[9px] text-gray-400">{h}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
