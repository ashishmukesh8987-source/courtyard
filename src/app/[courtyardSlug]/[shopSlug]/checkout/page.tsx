"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { getCourtyardBySlug, getShopBySlug } from "@/lib/firestore";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";
import type { Courtyard, Shop } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import { ArrowLeft, Minus, Plus, Trash2, LogIn, User as UserIcon } from "lucide-react";

export default function CheckoutPage() {
  const { courtyardSlug, shopSlug } = useParams<{
    courtyardSlug: string;
    shopSlug: string;
  }>();
  const router = useRouter();
  const { items, shopId: cartShopId, total, updateQuantity, removeItem, clearCart } = useCart();
  const { user, signInWithGoogle, signOut } = useAuth();

  const [courtyard, setCourtyard] = useState<Courtyard | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableNumber, setTableNumber] = useState("");

  // Pre-fill name from Google account
  useEffect(() => {
    if (user?.displayName && !customerName) {
      setCustomerName(user.displayName);
    }
  }, [user, customerName]);

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
        <Link href={`/${courtyardSlug}/${shopSlug}`} className="text-brand-500 font-medium">
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
          customerUid: user?.uid || null,
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
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-charcoal">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <Link
            href={`/${courtyardSlug}/${shopSlug}`}
            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to menu
          </Link>
          <h1 className="text-xl font-bold text-white">Checkout</h1>
          <p className="text-sm text-gray-400">{shop.name}</p>
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

        {/* Sign In (optional) */}
        <Card className="p-4">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-brand-500" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.displayName || user.email}</p>
                  <p className="text-xs text-gray-500">Signed in · Your order will be saved</p>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Sign in to track your orders anytime, or continue as guest.
              </p>
              <button
                onClick={async () => {
                  setSigningIn(true);
                  try { await signInWithGoogle(); toast.success("Signed in!"); }
                  catch { /* user cancelled */ }
                  setSigningIn(false);
                }}
                disabled={signingIn}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {signingIn ? "Signing in..." : "Continue with Google"}
              </button>
              <p className="text-center text-xs text-gray-400 mt-2">or continue as guest below</p>
            </div>
          )}
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
