export interface Courtyard {
  id: string;
  name: string;
  slug: string;
  address: string;
  adminUid: string;
  createdAt: Date;
}

export interface Shop {
  id: string;
  courtyardId: string;
  courtyardSlug: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  ownerUid: string;
  ownerEmail: string;
  isActive: boolean;
  createdAt: Date;
}

export interface MenuItem {
  id: string;
  shopId: string;
  courtyardId: string;
  name: string;
  price: number;
  description: string;
  category: string;
  imageUrl: string;
  isAvailable: boolean;
  createdAt: Date;
}

export interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
}

export type OrderStatus = "pending" | "preparing" | "ready" | "completed" | "cancelled";

export interface Order {
  id: string;
  shopId: string;
  shopName: string;
  courtyardId: string;
  tableNumber: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: "admin" | "shop_owner";
  courtyardId?: string;
  shopId?: string;
}

export interface CartItem extends OrderItem {}
