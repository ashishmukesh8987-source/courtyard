"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";
import {
  getMenuItemsByShop,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from "@/lib/firestore";
import { formatPrice } from "@/lib/utils";
import type { MenuItem } from "@/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import { ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";

export default function MenuManagementPage() {
  const router = useRouter();
  const { appUser, loading: authLoading } = useAuth();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!appUser || appUser.role !== "shop_owner" || !appUser.shopId) {
      router.push("/shop/login");
      return;
    }
    loadMenu();
  }, [appUser, authLoading, router]);

  async function loadMenu() {
    if (!appUser?.shopId) return;
    const data = await getMenuItemsByShop(appUser.shopId);
    setItems(data);
    setLoading(false);
  }

  function resetForm() {
    setName("");
    setPrice("");
    setCategory("");
    setDescription("");
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(item: MenuItem) {
    setName(item.name);
    setPrice(item.price.toString());
    setCategory(item.category);
    setDescription(item.description);
    setEditingId(item.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!name.trim() || !price.trim()) {
      toast.error("Name and price are required");
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Enter a valid price");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateMenuItem(editingId, {
          name: name.trim(),
          price: priceNum,
          category: category.trim() || "General",
          description: description.trim(),
        });
        toast.success("Item updated");
      } else {
        await createMenuItem({
          shopId: appUser!.shopId!,
          courtyardId: appUser!.courtyardId!,
          name: name.trim(),
          price: priceNum,
          category: category.trim() || "General",
          description: description.trim(),
          imageUrl: "",
          isAvailable: true,
        });
        toast.success("Item added");
      }
      resetForm();
      await loadMenu();
    } catch {
      toast.error("Failed to save item");
    }
    setSaving(false);
  }

  async function handleToggleAvailability(item: MenuItem) {
    try {
      await updateMenuItem(item.id, { isAvailable: !item.isAvailable });
      toast.success(item.isAvailable ? "Item hidden" : "Item visible");
      await loadMenu();
    } catch {
      toast.error("Failed to update");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this item?")) return;
    try {
      await deleteMenuItem(id);
      toast.success("Item deleted");
      await loadMenu();
    } catch {
      toast.error("Failed to delete");
    }
  }

  if (authLoading || loading) return <Spinner className="min-h-screen" />;

  // Group by category
  const categories = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const cat = item.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/shop/dashboard"
              className="text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Menu</h1>
            <span className="text-sm text-gray-400">({items.length} items)</span>
          </div>
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Add/Edit Form */}
        {showForm && (
          <Card className="p-4 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">
              {editingId ? "Edit Item" : "Add New Item"}
            </h2>
            <div className="space-y-3">
              <Input
                label="Item Name"
                placeholder="e.g. Paneer Tikka"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Price (₹)"
                  type="number"
                  placeholder="150"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <Input
                  label="Category"
                  placeholder="e.g. Starters"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
              <Input
                label="Description (optional)"
                placeholder="Short description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update" : "Add Item"}
                </Button>
                <Button variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Menu Items */}
        {items.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p>No menu items yet. Add your first item!</p>
          </div>
        ) : (
          Object.entries(categories).map(([cat, catItems]) => (
            <div key={cat} className="mb-6">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                {cat}
              </h2>
              <div className="space-y-2">
                {catItems.map((item) => (
                  <Card
                    key={item.id}
                    className={`p-3 flex items-center justify-between ${
                      !item.isAvailable ? "opacity-50" : ""
                    }`}
                  >
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-orange-600 font-semibold">
                        {formatPrice(item.price)}
                      </p>
                      {item.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleAvailability(item)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                        title={item.isAvailable ? "Hide item" : "Show item"}
                      >
                        {item.isAvailable ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => startEdit(item)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
