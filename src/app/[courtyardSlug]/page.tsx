"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getCourtyardBySlug, getShopsByCourtyard } from "@/lib/firestore";
import type { Courtyard, Shop } from "@/types";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import { ArrowLeft, Store, Search } from "lucide-react";

export default function CourtyardPage() {
  const { courtyardSlug } = useParams<{ courtyardSlug: string }>();
  const [courtyard, setCourtyard] = useState<Courtyard | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const cy = await getCourtyardBySlug(courtyardSlug);
      if (!cy) {
        setLoading(false);
        return;
      }
      setCourtyard(cy);
      const s = await getShopsByCourtyard(cy.id);
      setShops(s);
      setLoading(false);
    }
    load();
  }, [courtyardSlug]);

  if (loading) return <Spinner className="min-h-screen" />;
  if (!courtyard) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg">Food court not found.</p>
          <Link href="/" className="text-orange-600 mt-2 inline-block">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{courtyard.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{courtyard.address}</p>
        </div>
      </div>

      {/* Shop List */}
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Choose a stall
          </h2>
          <span className="text-xs text-gray-400">{shops.length} stalls</span>
        </div>

        {/* Search */}
        {shops.length > 0 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search stalls..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-colors"
            />
          </div>
        )}

        {shops.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Store className="w-12 h-12 mx-auto mb-3" />
            <p>No stalls are open right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shops
              .filter((shop) =>
                search.trim() === "" ||
                shop.name.toLowerCase().includes(search.toLowerCase()) ||
                (shop.description && shop.description.toLowerCase().includes(search.toLowerCase()))
              ).map((shop) => (
              <Link key={shop.id} href={`/${courtyardSlug}/${shop.slug}`}>
                <Card className="p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer mb-3">
                  {shop.imageUrl ? (
                    <img
                      src={shop.imageUrl}
                      alt={shop.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Store className="w-7 h-7 text-orange-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{shop.name}</h3>
                    {shop.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{shop.description}</p>
                    )}
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
