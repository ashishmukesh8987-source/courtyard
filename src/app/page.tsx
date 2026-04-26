"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCourtyards } from "@/lib/firestore";
import type { Courtyard } from "@/types";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import { MapPin, UtensilsCrossed, Search, ShoppingBag } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function HomePage() {
  const [courtyards, setCourtyards] = useState<Courtyard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    getCourtyards().then((data) => {
      setCourtyards(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-600 text-white mb-4">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Baithaki</h1>
          <p className="mt-2 text-lg text-gray-600">
            Scan, browse menus, and order — right from your table.
          </p>
        </div>

        {/* Search */}
        {!loading && courtyards.length > 0 && (
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search food courts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-colors"
            />
          </div>
        )}

        {loading ? (
          <Spinner className="py-20" />
        ) : courtyards.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p>No food courts available yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {courtyards
              .filter((c) =>
                search.trim() === "" ||
                c.name.toLowerCase().includes(search.toLowerCase()) ||
                c.address.toLowerCase().includes(search.toLowerCase())
              ).map((c) => (
              <Link key={c.id} href={`/${c.slug}`}>
                <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                  <h2 className="text-xl font-semibold text-gray-900">{c.name}</h2>
                  <div className="mt-2 flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="w-4 h-4" />
                    <span>{c.address}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-16 flex justify-center gap-6 text-sm text-gray-400">
          {user && (
            <Link href="/my-orders" className="hover:text-orange-600 transition-colors flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5" /> My Orders
            </Link>
          )}
          <Link href="/shop/login" className="hover:text-orange-600 transition-colors">
            Shop Login
          </Link>
          <Link href="/admin/login" className="hover:text-orange-600 transition-colors">
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
}
