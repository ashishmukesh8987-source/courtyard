"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getCourtyardBySlug, getShopBySlug, getMenuItemsByShop } from "@/lib/firestore";
import { useCart } from "@/hooks/useCart";
import { formatPrice } from "@/lib/utils";
import type { Courtyard, Shop, MenuItem } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { ArrowLeft, Plus, Minus, ShoppingBag, Search, Bell } from "lucide-react";
import toast from "react-hot-toast";

export default function ShopMenuPage() {
  const { courtyardSlug, shopSlug } = useParams<{
    courtyardSlug: string;
    shopSlug: string;
  }>();
  const router = useRouter();
  const { items: cartItems, shopId: cartShopId, addItem, updateQuantity, itemCount, total } = useCart();

  const [courtyard, setCourtyard] = useState<Courtyard | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [callingWaiter, setCallingWaiter] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  useEffect(() => {
    async function load() {
      const cy = await getCourtyardBySlug(courtyardSlug);
      if (!cy) { setLoading(false); return; }
      setCourtyard(cy);
      const s = await getShopBySlug(cy.id, shopSlug);
      if (!s) { setLoading(false); return; }
      setShop(s);
      const items = await getMenuItemsByShop(s.id);
      setMenuItems(items.filter((i) => i.isAvailable));
      setLoading(false);
    }
    load();
  }, [courtyardSlug, shopSlug]);

  if (loading) return <Spinner className="min-h-screen" />;
  if (!courtyard || !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <p>Shop not found.</p>
      </div>
    );
  }

  // All unique categories
  const allCategories = Array.from(
    new Set(menuItems.map((item) => item.category || "Other"))
  ).sort();

  // Filter by search and category
  const filtered = menuItems.filter((item) => {
    const matchesSearch =
      search.trim() === "" ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory =
      selectedCategory === "All" || (item.category || "Other") === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const categories = filtered.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const cat = item.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  function getCartQuantity(itemId: string) {
    if (cartShopId !== shop!.id) return 0;
    return cartItems.find((i) => i.itemId === itemId)?.quantity || 0;
  }

  return (
    <div className="min-h-screen bg-cream pb-24">
      {/* Header */}
      <div className="bg-charcoal sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <Link
              href={`/${courtyardSlug}`}
              className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" /> {courtyard.name}
            </Link>
            <button
              onClick={async () => {
                const table = prompt("Enter your table number:");
                if (!table || !table.trim()) return;
                setCallingWaiter(true);
                try {
                  const res = await fetch("/api/waiter-call", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      shopId: shop!.id,
                      courtyardId: courtyard!.id,
                      tableNumber: table.trim(),
                    }),
                  });
                  if (!res.ok) throw new Error();
                  toast.success("Waiter has been notified! They'll be at your table shortly.");
                } catch {
                  toast.error("Failed to call waiter. Try again.");
                }
                setCallingWaiter(false);
              }}
              disabled={callingWaiter}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-accent-500 rounded-lg hover:bg-accent-600 transition-colors disabled:opacity-50"
            >
              <Bell className="w-4 h-4" />
              {callingWaiter ? "Calling..." : "Call Waiter"}
            </button>
          </div>
          <h1 className="text-xl font-bold text-white">{shop.name}</h1>
          {shop.description && (
            <p className="text-sm text-gray-400 mt-0.5">{shop.description}</p>
          )}
        </div>
      </div>

      {/* Menu */}
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Search */}
        {menuItems.length > 0 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>
        )}

        {/* Category Filter */}
        {allCategories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory("All")}
              className={`flex-shrink-0 px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                selectedCategory === "All"
                  ? "bg-brand-500 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
              }`}
            >
              All
            </button>
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                  selectedCategory === cat
                    ? "bg-brand-500 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {menuItems.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p>Menu is being prepared...</p>
          </div>
        ) : (
          Object.entries(categories).map(([category, items]) => (
            <div key={category} className="mb-8">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                {category}
              </h2>
              <div className="space-y-2">
                {items.map((item) => {
                  const qty = getCartQuantity(item.id);
                  return (
                    <Card key={item.id} className="p-4 flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        {item.description && (
                          <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
                        )}
                        <p className="text-sm font-semibold text-brand-500 mt-1">
                          {formatPrice(item.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {qty > 0 ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.id, qty - 1)}
                              className="w-8 h-8 rounded-full bg-brand-100 text-brand-500 flex items-center justify-center hover:bg-brand-200 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-6 text-center font-medium">{qty}</span>
                            <button
                              onClick={() => addItem(item, shop.id)}
                              className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => addItem(item, shop.id)}
                          >
                            <Plus className="w-4 h-4 mr-1" /> Add
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Bar */}
      {itemCount > 0 && cartShopId === shop.id && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-20">
          <div className="mx-auto max-w-2xl">
            <button
              onClick={() => router.push(`/${courtyardSlug}/${shopSlug}/checkout`)}
              className="w-full bg-brand-500 text-white rounded-xl py-3.5 px-6 font-medium flex items-center justify-between hover:bg-brand-600 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                <span>
                  {itemCount} item{itemCount !== 1 && "s"}
                </span>
              </div>
              <span className="font-semibold">{formatPrice(total)}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
