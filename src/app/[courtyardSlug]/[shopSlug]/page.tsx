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
import { ArrowLeft, Plus, Minus, ShoppingBag, Search } from "lucide-react";

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

  // Filter by search
  const filtered = menuItems.filter((item) =>
    search.trim() === "" ||
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(search.toLowerCase())) ||
    (item.category && item.category.toLowerCase().includes(search.toLowerCase()))
  );

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
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <Link
            href={`/${courtyardSlug}`}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> {courtyard.name}
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{shop.name}</h1>
          {shop.description && (
            <p className="text-sm text-gray-500 mt-0.5">{shop.description}</p>
          )}
        </div>
      </div>

      {/* Menu */}
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Search */}
        {menuItems.length > 0 && (
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-colors"
            />
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
                        <p className="text-sm font-semibold text-orange-600 mt-1">
                          {formatPrice(item.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {qty > 0 ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.id, qty - 1)}
                              className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-6 text-center font-medium">{qty}</span>
                            <button
                              onClick={() => addItem(item, shop.id)}
                              className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center hover:bg-orange-700 transition-colors"
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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
          <div className="mx-auto max-w-2xl">
            <button
              onClick={() => router.push(`/${courtyardSlug}/${shopSlug}/checkout`)}
              className="w-full bg-orange-600 text-white rounded-xl py-3.5 px-6 font-medium flex items-center justify-between hover:bg-orange-700 transition-colors"
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
