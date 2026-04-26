"use client";

import { useState, useCallback, useEffect } from "react";
import type { CartItem, MenuItem } from "@/types";

const CART_KEY = "foodcourt_cart";
const CART_SHOP_KEY = "foodcourt_cart_shop";

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(CART_KEY);
    const savedShop = localStorage.getItem(CART_SHOP_KEY);
    if (saved) setItems(JSON.parse(saved));
    if (savedShop) setShopId(savedShop);
  }, []);

  const persist = useCallback((newItems: CartItem[], newShopId: string | null) => {
    setItems(newItems);
    setShopId(newShopId);
    localStorage.setItem(CART_KEY, JSON.stringify(newItems));
    if (newShopId) localStorage.setItem(CART_SHOP_KEY, newShopId);
    else localStorage.removeItem(CART_SHOP_KEY);
  }, []);

  const addItem = useCallback(
    (menuItem: MenuItem, currentShopId: string) => {
      // If switching shops, clear cart
      if (shopId && shopId !== currentShopId) {
        const newItem: CartItem = {
          itemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1,
        };
        persist([newItem], currentShopId);
        return;
      }

      const existing = items.find((i) => i.itemId === menuItem.id);
      let newItems: CartItem[];
      if (existing) {
        newItems = items.map((i) =>
          i.itemId === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        newItems = [
          ...items,
          { itemId: menuItem.id, name: menuItem.name, price: menuItem.price, quantity: 1 },
        ];
      }
      persist(newItems, currentShopId);
    },
    [items, shopId, persist]
  );

  const removeItem = useCallback(
    (itemId: string) => {
      const newItems = items.filter((i) => i.itemId !== itemId);
      persist(newItems, newItems.length > 0 ? shopId : null);
    },
    [items, shopId, persist]
  );

  const updateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(itemId);
        return;
      }
      const newItems = items.map((i) => (i.itemId === itemId ? { ...i, quantity } : i));
      persist(newItems, shopId);
    },
    [items, shopId, persist, removeItem]
  );

  const clearCart = useCallback(() => {
    persist([], null);
  }, [persist]);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, shopId, total, itemCount, addItem, removeItem, updateQuantity, clearCart };
}
