import type { OrderStatus } from "@/types";

const statusConfig: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending" },
  preparing: { bg: "bg-blue-100", text: "text-blue-800", label: "Preparing" },
  ready: { bg: "bg-green-100", text: "text-green-800", label: "Ready" },
  completed: { bg: "bg-gray-100", text: "text-gray-800", label: "Completed" },
  cancelled: { bg: "bg-red-100", text: "text-red-800", label: "Cancelled" },
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
