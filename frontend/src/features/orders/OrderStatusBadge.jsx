import React from 'react';
import { Clock, Wrench, CheckCircle2, Check, XCircle } from 'lucide-react';

export default function OrderStatusBadge({ status }) {
  const configs = {
    PENDING: {
      label: 'Pending',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: Clock,
    },
    PROCESSING: {
      label: 'At Lab',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: Wrench,
    },
    READY_FOR_PICKUP: {
      label: 'Ready for Pickup',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      icon: CheckCircle2,
    },
    DELIVERED: {
      label: 'Delivered',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: Check,
    },
    CANCELLED: {
      label: 'Cancelled',
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: XCircle,
    },
  };

  const config = configs[status] || configs.PENDING;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
