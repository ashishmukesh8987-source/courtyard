"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatPrice, formatDate } from "@/lib/utils";
import type { OrderStatus } from "@/types";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { CheckCircle, Clock, ChefHat, Bell, XCircle } from "lucide-react";

interface PublicOrder {
  id: string;
  shopName: string;
  status: OrderStatus;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  tableNumber: string;
  createdAt: string;
  updatedAt: string;
}

const steps: { status: OrderStatus; icon: React.ElementType; label: string }[] = [
  { status: "pending", icon: Clock, label: "Order Placed" },
  { status: "preparing", icon: ChefHat, label: "Preparing" },
  { status: "ready", icon: Bell, label: "Ready for Pickup" },
  { status: "completed", icon: CheckCircle, label: "Completed" },
];

function statusIndex(status: OrderStatus): number {
  const idx = steps.findIndex((s) => s.status === status);
  return idx === -1 ? -1 : idx;
}

export default function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json();
      setOrder(data);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
    // Poll every 5 seconds for status updates
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  if (loading) return <Spinner className="min-h-screen" />;
  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <p>Order not found.</p>
      </div>
    );
  }

  const currentIdx = statusIndex(order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-charcoal">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Order Status</h1>
              <p className="text-sm text-gray-400 mt-0.5">{order.shopName}</p>
            </div>
            <Badge status={order.status} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Progress Tracker */}
        {!isCancelled ? (
          <Card className="p-6">
            <div className="relative">
              {steps.map((step, idx) => {
                const isActive = idx <= currentIdx;
                const Icon = step.icon;
                return (
                  <div key={step.status} className="flex items-start gap-4 mb-6 last:mb-0">
                    <div className="relative flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isActive
                            ? "bg-brand-500 text-white"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      {idx < steps.length - 1 && (
                        <div
                          className={`w-0.5 h-6 mt-1 ${
                            idx < currentIdx ? "bg-brand-500" : "bg-gray-200"
                          }`}
                        />
                      )}
                    </div>
                    <div className="pt-2">
                      <p
                        className={`text-sm font-medium ${
                          isActive ? "text-gray-900" : "text-gray-400"
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card className="p-6 text-center">
            <XCircle className="w-12 h-12 mx-auto text-red-500 mb-3" />
            <p className="text-lg font-semibold text-gray-900">Order Cancelled</p>
            <p className="text-sm text-gray-500 mt-1">
              This order has been cancelled by the shop.
            </p>
          </Card>
        )}

        {/* Order Details */}
        <Card className="p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Order Details</h2>
          <div className="space-y-2">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.name} × {item.quantity}
                </span>
                <span className="text-gray-900 font-medium">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between font-semibold text-gray-900">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </Card>

        {/* Info */}
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Table</p>
              <p className="font-medium text-gray-900">{order.tableNumber}</p>
            </div>
            <div>
              <p className="text-gray-500">Placed at</p>
              <p className="font-medium text-gray-900">{formatDate(new Date(order.createdAt))}</p>
            </div>
            <div>
              <p className="text-gray-500">Order ID</p>
              <p className="font-medium text-gray-900 text-xs mt-0.5 break-all">
                {order.id}
              </p>
            </div>
          </div>
        </Card>

        <div className="text-center">
          <Link href="/" className="text-sm text-brand-500 hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
