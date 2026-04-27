import type { OrderStatus } from "@/types";

const statusConfig: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-mustard-100", text: "text-earth-500", label: "Pending" },
  preparing: { bg: "bg-accent-100", text: "text-accent-600", label: "Preparing" },
  ready: { bg: "bg-fresh-100", text: "text-fresh-600", label: "Ready" },
  completed: { bg: "bg-gray-100", text: "text-gray-800", label: "Completed" },
  cancelled: { bg: "bg-brand-100", text: "text-brand-600", label: "Cancelled" },
};

export default function Badge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}
