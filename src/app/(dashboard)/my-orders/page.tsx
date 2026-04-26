"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getAuthHeaders } from "@/lib/api-client";
import { formatPrice, formatDate } from "@/lib/utils";
import type { OrderStatus } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { ArrowLeft, ShoppingBag } from "lucide-react";

interface MyOrder {
  id: string;
  shopName: string;
  status: OrderStatus;
  total: number;
  items: { name: string; quantity: number; price: number }[];
  tableNumber: string;
  createdAt: string;
}

export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    loadOrders();
  }, [user, authLoading]);

  async function loadOrders() {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/orders/my-orders", { headers });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrders(data.orders);
    } catch {
      // ignore
    }
    setLoading(false);
  }

  if (authLoading || loading) return <Spinner className="min-h-screen" />;

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500 px-4">
        <ShoppingBag className="w-12 h-12 mb-3 text-gray-300" />
        <p className="mb-2">Sign in to see your order history</p>
        <Link href="/" className="text-orange-600 text-sm hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <h1 className="text-xl font-bold text-gray-900">My Orders</h1>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        {orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3" />
            <p>No orders yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link key={order.id} href={`/order/${order.id}`}>
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer mb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{order.shopName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(new Date(order.createdAt))} · Table {order.tableNumber}
                      </p>
                    </div>
                    <Badge status={order.status} />
                  </div>
                  <div className="text-sm text-gray-500">
                    {order.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-gray-900">
                    {formatPrice(order.total)}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
