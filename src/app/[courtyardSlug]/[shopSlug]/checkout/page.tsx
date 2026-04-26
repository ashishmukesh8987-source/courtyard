"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { getCourtyardBySlug, getShopBySlug } from "@/lib/firestore";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/lib/utils";
import type { Courtyard, Shop } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";

export default function CheckoutPage() {
  const { courtyardSlug, shopSlug } = useParams<{
    courtyardSlug: string;
    shopSlug: string;
  }>();
  const router = useRouter();
  const { items, shopId: cartShopId, total, updateQuantity, removeItem, clearCart } = useCart();

  const [courtyard, setCourtyard] = useState<Courtyard | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableNumber, setTableNumber] = useState("");

  useEffect(() => {
    async function load() {
      const cy = await getCourtyardBySlug(courtyardSlug);
      if (!cy) { setLoading(false); return; }
      setCourtyard(cy);
      const s = await getShopBySlug(cy.id, shopSlug);
      setShop(s);
      setLoading(false);
    }
    load();
  }, [courtyardSlug, shopSlug]);

  if (loading) return <Spinner className="min-h-screen" />;
  if (!courtyard || !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <p>Page not found.</p>
      </div>
    );
  }

  if (items.length === 0 || cartShopId !== shop.id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500 px-4">
        <p className="mb-4">Your cart is empty.</p>
        <Link href={`/${courtyardSlug}/${shopSlug}`} className="text-orange-600 font-medium">
          Browse menu
        </Link>
      </div>
    );
  }

  async function handlePlaceOrder() {
    if (!customerName.trim()) { toast.error("Please enter your name"); return; }
    if (!customerPhone.trim() || customerPhone.trim().length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }
    if (!tableNumber.trim()) { toast.error("Please enter your table number"); return; }

    setPlacing(true);
    try {
      // Server-side validated order creation
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: shop!.id,
          courtyardId: courtyard!.id,
          tableNumber: tableNumber.trim(),
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          items: items.map((i) => ({ itemId: i.itemId, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to place order");
        setPlacing(false);
        return;
      }
      clearCart();
      toast.success("Order placed!");
      router.push(`/order/${data.orderId}`);
    } catch {
      toast.error("Failed to place order. Try again.");
      setPlacing(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <Link
            href={`/${courtyardSlug}/${shopSlug}`}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to menu
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
          <p className="text-sm text-gray-500">{shop.name}</p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Cart Items */}
        <Card className="p-4">
          <h2 className="font-semibold text-gray-900 mb-4">Your Order</h2>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.itemId} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">{formatPrice(item.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.itemId, item.quantity - 1)}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.itemId, item.quantity + 1)}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeItem(item.itemId)}
                    className="w-7 h-7 rounded-full text-red-500 hover:bg-red-50 flex items-center justify-center ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between font-semibold text-gray-900">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </Card>

        {/* Customer Info */}
        <Card className="p-4">
          <h2 className="font-semibold text-gray-900 mb-4">Your Details</h2>
          <div className="space-y-3">
            <Input
              label="Name"
              placeholder="Enter your name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
            <Input
              label="Phone Number"
              placeholder="10-digit phone number"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              required
            />
            <Input
              label="Table Number"
              placeholder="e.g. 12"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              required
            />
          </div>
        </Card>

        {/* Place Order */}
        <Button
          className="w-full"
          size="lg"
          onClick={handlePlaceOrder}
          disabled={placing}
        >
          {placing ? "Placing order..." : `Place Order — ${formatPrice(total)}`}
        </Button>

        <p className="text-center text-xs text-gray-400">
          Pay at the counter when your order is ready.
        </p>
      </div>
    </div>
  );
}
