"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";
import {
  getAllShopsByCourtyard,
  updateShop,
  deleteShop,
} from "@/lib/firestore";
import { getAuthHeaders } from "@/lib/api-client";
import type { Shop } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import { ArrowLeft, Plus, Store, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";

export default function AdminShopsPage() {
  const router = useRouter();
  const { appUser, loading: authLoading } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form
  const [shopName, setShopName] = useState("");
  const [shopDesc, setShopDesc] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!appUser || appUser.role !== "admin" || !appUser.courtyardId) {
      router.push("/admin/login");
      return;
    }
    loadShops();
  }, [appUser, authLoading, router]);

  async function loadShops() {
    if (!appUser?.courtyardId) return;
    const data = await getAllShopsByCourtyard(appUser.courtyardId);
    setShops(data);
    setLoading(false);
  }

  async function handleAddShop() {
    if (!shopName.trim() || !ownerEmail.trim() || !ownerPassword.trim()) {
      toast.error("Fill all required fields");
      return;
    }
    if (ownerPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    try {
      // Everything happens server-side: auth account + shop doc + user profile
      const headers = await getAuthHeaders();
      const res = await fetch("/api/admin/create-shop", {
        method: "POST",
        headers,
        body: JSON.stringify({
          shopName: shopName.trim(),
          shopDesc: shopDesc.trim(),
          ownerEmail: ownerEmail.trim(),
          ownerPassword,
          courtyardId: appUser!.courtyardId!,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create shop");
        setSaving(false);
        return;
      }

      toast.success("Shop created! Owner can login with: " + ownerEmail);
      setShopName("");
      setShopDesc("");
      setOwnerEmail("");
      setOwnerPassword("");
      setShowForm(false);
      await loadShops();
    } catch (err) {
      toast.error("Failed to add shop");
      console.error(err);
    }
    setSaving(false);
  }

  async function handleToggle(shop: Shop) {
    try {
      await updateShop(shop.id, { isActive: !shop.isActive });
      toast.success(shop.isActive ? "Shop deactivated" : "Shop activated");
      await loadShops();
    } catch {
      toast.error("Failed to update shop");
    }
  }

  async function handleDelete(shop: Shop) {
    if (!confirm(`Delete "${shop.name}"? This cannot be undone.`)) return;
    try {
      await deleteShop(shop.id);
      toast.success("Shop deleted");
      await loadShops();
    } catch {
      toast.error("Failed to delete shop");
    }
  }

  if (authLoading || loading) return <Spinner className="min-h-screen" />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Manage Shops</h1>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-1" /> Add Shop
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        {/* Add Shop Form */}
        {showForm && (
          <Card className="p-4">
            <h2 className="font-semibold text-gray-900 mb-4">Add New Shop</h2>
            <div className="space-y-3">
              <Input
                label="Shop Name"
                placeholder="e.g. The Wok Station"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
              />
              <Input
                label="Description (optional)"
                placeholder="Chinese, Thai & Asian fusion"
                value={shopDesc}
                onChange={(e) => setShopDesc(e.target.value)}
              />
              <Input
                label="Owner Email"
                type="email"
                placeholder="owner@example.com"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
              />
              <Input
                label="Owner Password"
                type="password"
                placeholder="Min 6 characters"
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
              />
              <p className="text-xs text-gray-400">
                The owner will use these credentials to log in at /shop/login
              </p>
              <div className="flex gap-2">
                <Button onClick={handleAddShop} disabled={saving}>
                  {saving ? "Creating..." : "Create Shop"}
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Shop List */}
        {shops.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Store className="w-10 h-10 mx-auto mb-3" />
            <p>No shops yet. Add your first one!</p>
          </div>
        ) : (
          shops.map((shop) => (
            <Card
              key={shop.id}
              className={`p-4 flex items-center justify-between ${
                !shop.isActive ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Store className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{shop.name}</p>
                  <p className="text-xs text-gray-400">{shop.ownerEmail}</p>
                  {!shop.isActive && (
                    <span className="text-xs text-red-500 font-medium">Inactive</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggle(shop)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  title={shop.isActive ? "Deactivate" : "Activate"}
                >
                  {shop.isActive ? (
                    <ToggleRight className="w-5 h-5 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(shop)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
