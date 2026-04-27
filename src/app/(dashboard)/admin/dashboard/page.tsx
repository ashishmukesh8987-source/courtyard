"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";
import {
  getAllShopsByCourtyard,
  getCourtyardsByAdmin,
  createCourtyard,
  updateCourtyard,
  setAppUser,
} from "@/lib/firestore";
import { slugify } from "@/lib/utils";
import type { Shop, Courtyard } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import { LogOut, Store, ShoppingBag, Shield, Plus, MapPin } from "lucide-react";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { appUser, loading: authLoading, signOut, refreshUser } = useAuth();
  const [courtyards, setCourtyards] = useState<Courtyard[]>([]);
  const [selectedCourtyard, setSelectedCourtyard] = useState<Courtyard | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [orderCount, setOrderCount] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  // Create courtyard form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!appUser || appUser.role !== "admin") {
      router.push("/admin/login");
      return;
    }
    loadCourtyards();
  }, [appUser, authLoading, router]);

  async function loadCourtyards() {
    if (!appUser) return;
    const list = await getCourtyardsByAdmin(appUser.uid);
    setCourtyards(list);
    if (list.length > 0) {
      // Select the one stored in appUser.courtyardId, or first one
      const current = list.find((c) => c.id === appUser.courtyardId) || list[0];
      setSelectedCourtyard(current);
      await loadData(current.id);
    } else {
      setLoading(false);
    }
  }

  async function loadData(courtyardId: string) {
    const shopList = await getAllShopsByCourtyard(courtyardId);
    setShops(shopList);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    try {
      const q = query(
        collection(db, "orders"),
        where("courtyardId", "==", courtyardId),
        where("createdAt", ">=", Timestamp.fromDate(today))
      );
      const snap = await getDocs(q);
      setOrderCount(snap.size);
      let rev = 0;
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.status !== "cancelled") rev += data.total || 0;
      });
      setTodayRevenue(rev);
    } catch {
      setOrderCount(0);
      setTodayRevenue(0);
    }
    setLoading(false);
  }

  async function handleSwitchCourtyard(cy: Courtyard) {
    setSelectedCourtyard(cy);
    setLoading(true);
    // Update the user's active courtyardId
    await setAppUser(appUser!.uid, {
      ...appUser!,
      courtyardId: cy.id,
    });
    // Refresh auth context so other pages see the new courtyardId
    await refreshUser();
    await loadData(cy.id);
  }

  async function handleCreateCourtyard() {
    if (!newName.trim()) { toast.error("Enter courtyard name"); return; }
    if (!newAddress.trim()) { toast.error("Enter address"); return; }
    setCreating(true);
    try {
      const id = await createCourtyard({
        name: newName.trim(),
        slug: slugify(newName.trim()),
        address: newAddress.trim(),
        adminUid: appUser!.uid,
      });
      // If this is the first courtyard, set it as active
      if (!appUser!.courtyardId) {
        await setAppUser(appUser!.uid, {
          ...appUser!,
          courtyardId: id,
        });
      }
      toast.success("Courtyard created!");
      setNewName("");
      setNewAddress("");
      setShowCreateForm(false);
      await loadCourtyards();
    } catch {
      toast.error("Failed to create courtyard");
    }
    setCreating(false);
  }

  if (authLoading || loading) return <Spinner className="min-h-screen" />;

  const activeShops = shops.filter((s) => s.isActive).length;

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-charcoal">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-300" /> Admin
          </h1>
          <button
            onClick={() => { signOut(); router.push("/admin/login"); }}
            className="text-gray-400 hover:text-white"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Courtyards Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Your Courtyards</h2>
            <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
              <Plus className="w-4 h-4 mr-1" /> New
            </Button>
          </div>

          {showCreateForm && (
            <Card className="p-4 mb-4">
              <div className="space-y-3">
                <Input
                  label="Courtyard Name"
                  placeholder="e.g. XYZ Food Court"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Input
                  label="Address"
                  placeholder="e.g. 123 Main Street, Mumbai"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={handleCreateCourtyard} disabled={creating}>
                    {creating ? "Creating..." : "Create Courtyard"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                </div>
              </div>
            </Card>
          )}

          {courtyards.length === 0 ? (
            <Card className="p-8 text-center text-gray-400">
              <MapPin className="w-8 h-8 mx-auto mb-2" />
              <p>No courtyards yet. Create your first one!</p>
            </Card>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {courtyards.map((cy) => (
                <button
                  key={cy.id}
                  onClick={() => handleSwitchCourtyard(cy)}
                  className={`text-left rounded-xl border p-4 transition-all ${
                    selectedCourtyard?.id === cy.id
                      ? "border-brand-500 bg-brand-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <p className="font-semibold text-gray-900">{cy.name}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <MapPin className="w-3 h-3" /> {cy.address}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stats (only if courtyard selected) */}
        {selectedCourtyard && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-4 text-center">
                <Store className="w-6 h-6 mx-auto text-brand-500 mb-1" />
                <p className="text-2xl font-bold text-gray-900">{activeShops}/{shops.length}</p>
                <p className="text-xs text-gray-500">Active Shops</p>
              </Card>
              <Card className="p-4 text-center">
                <ShoppingBag className="w-6 h-6 mx-auto text-fresh-500 mb-1" />
                <p className="text-2xl font-bold text-gray-900">{orderCount}</p>
                <p className="text-xs text-gray-500">Today&apos;s Orders</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-sm text-gray-400 mb-1">₹</p>
                <p className="text-2xl font-bold text-gray-900">₹{todayRevenue}</p>
                <p className="text-xs text-gray-500">Today&apos;s Revenue</p>
              </Card>
            </div>

            {/* Manage Shops Link */}
            <Link href="/admin/shops">
              <Card className="p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center">
                    <Store className="w-5 h-5 text-brand-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Manage Shops</p>
                    <p className="text-sm text-gray-500">{shops.length} shops in {selectedCourtyard.name}</p>
                  </div>
                </div>
                <span className="text-gray-400">→</span>
              </Card>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
