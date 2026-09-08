import React from 'react';
import { ShipmentGlobalStatus } from '@/lib/domain/shipment/types';

interface ShipmentStatusBadgeProps {
  status: ShipmentGlobalStatus | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; pulse?: boolean }
> = {
  DRAFT: {
    label: 'DRAFT',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300'
  },
  PLANNED: {
    label: 'PLANNED',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200'
  },
  BOOKED: {
    label: 'BOOKED',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200'
  },
  IN_TRANSIT: {
    label: 'IN TRANSIT',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
    pulse: true
  },
  AT_INTERMEDIATE_NODE: {
    label: 'AT HUB / PORT',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200'
  },
  CUSTOMS_HOLD: {
    label: 'CUSTOMS HOLD',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-300',
    pulse: true
  },
  CUSTOMS_RELEASED: {
    label: 'CUSTOMS CLEARED',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-300'
  },
  OUT_FOR_DELIVERY: {
    label: 'OUT FOR DELIVERY',
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-300',
    pulse: true
  },
  DELIVERED: {
    label: 'DELIVERED',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-300'
  },
  COMPLETED: {
    label: 'COMPLETED',
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300'
  },
  EXCEPTION_HOLD: {
    label: 'EXCEPTION HOLD',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-400',
    pulse: true
  },
  CANCELLED: {
    label: 'CANCELLED',
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    border: 'border-gray-300'
  }
};

export const ShipmentStatusBadge: React.FC<ShipmentStatusBadgeProps> = ({
  status,
  className = '',
  size = 'md'
}) => {
  const config = STATUS_CONFIG[status] || {
    label: status,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300'
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-semibold'
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
        </span>
      )}
      <span>{config.label}</span>
    </span>
  );
};
