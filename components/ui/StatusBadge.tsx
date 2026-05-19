import React from 'react';
import { STATUS_MAP } from '@/lib/statusMapping';

interface StatusBadgeProps {
  /** English status code (e.g., 'accepted', 'in_progress', 'completed', etc.) */
  status: string;
  /** Optional additional class names */
  className?: string;
}

// Simple colour map – can be extended later
const colorMap: Record<string, string> = {
  accepted: 'bg-emerald-500 text-white',
  'ORDER DITERIMA': 'bg-emerald-500 text-white',
  in_progress: 'bg-amber-500 text-white',
  'DALAM PERJALANAN': 'bg-amber-500 text-white',
  completed: 'bg-cyan-500 text-white',
  'PEKERJAAN SELESAI': 'bg-cyan-500 text-white',
  pending: 'bg-amber-100 text-amber-900 border-amber-200',
  assigned: 'bg-blue-100 text-blue-900 border-blue-200',
  need_assignment: 'bg-rose-100 text-rose-900 border-rose-200',
  default: 'bg-gray-300 text-black',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const label = STATUS_MAP[status]?.label ?? status;
  const color = colorMap[status] ?? colorMap.default;
  return (
    <span className={`px-2 py-1 rounded ${color} ${className}`}>{label}</span>
  );
};
