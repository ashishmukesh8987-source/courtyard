"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";
import { onOrdersForShop, updateOrderStatus } from "@/lib/firestore";
import { formatPrice, formatDate } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { LogOut, UtensilsCrossed, Phone, Hash, User, Clock } from "lucide-react";

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "preparing",
  preparing: "ready",
  ready: "completed",
};

const nextLabel: Partial<Record<OrderStatus, string>> = {
  pending: "Start Preparing",
  preparing: "Mark Ready",
  ready: "Complete",
};

export default function ShopDashboardPage() {
  const router = useRouter();
  const { appUser, loading: authLoading, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "completed" | "all">("active");

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

  const filteredOrders = orders.filter((o) => {
    if (filter === "active") return ["pending", "preparing", "ready"].includes(o.status);
    if (filter === "completed") return ["completed", "cancelled"].includes(o.status);
    return true;
  });

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    try {
      await updateOrderStatus(orderId, status);
      toast.success(`Order updated to ${status}`);
    } catch {
      toast.error("Failed to update order");
    }
  }

  async function handleCancel(orderId: string) {
    try {
      await updateOrderStatus(orderId, "cancelled");
      toast.success("Order cancelled");
    } catch {
      toast.error("Failed to cancel order");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-orange-600" />
              Orders
              {pendingCount > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                  {pendingCount} new
                </span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/shop/dashboard/menu">
              <Button variant="secondary" size="sm">Menu</Button>
            </Link>
            <button
              onClick={() => { signOut(); router.push("/shop/login"); }}
              className="text-gray-400 hover:text-gray-600"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="mx-auto max-w-3xl px-4 flex gap-1 pb-2">
          {(["active", "completed", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                filter === f
                  ? "bg-orange-100 text-orange-700"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Orders */}
      <div className="mx-auto max-w-3xl px-4 py-4 space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Clock className="w-10 h-10 mx-auto mb-3" />
            <p>No {filter} orders</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge status={order.status} />
                    <span className="text-xs text-gray-400">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> {order.customerName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> {order.customerPhone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5" /> Table {order.tableNumber}
                    </span>
                  </div>
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  {formatPrice(order.total)}
                </span>
              </div>

              {/* Items */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm py-0.5">
                    <span className="text-gray-700">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="text-gray-500">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              {nextStatus[order.status] && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(order.id, nextStatus[order.status]!)}
                  >
                    {nextLabel[order.status]}
                  </Button>
                  {order.status === "pending" && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleCancel(order.id)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
