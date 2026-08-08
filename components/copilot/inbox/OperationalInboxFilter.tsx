'use client';

import React from 'react';

export interface OperationalInboxFilterProps {
  sbuFilter: string;
  priorityFilter: string;
  onSbuChange: (sbu: string) => void;
  onPriorityChange: (priority: string) => void;
}

const SBU_OPTIONS = [
  { value: 'all', label: 'All SBU' },
  { value: 'trucking', label: 'Trucking' },
  { value: 'forwarding', label: 'Forwarding' },
  { value: 'warehouse', label: 'Warehouse' },
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All Priority' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

export default function OperationalInboxFilter({
  sbuFilter,
  priorityFilter,
  onSbuChange,
  onPriorityChange
}: OperationalInboxFilterProps) {
  return (
    <div className="flex flex-row gap-2">
      <select
        value={sbuFilter}
        onChange={(e) => onSbuChange(e.target.value)}
        className="flex-1 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-8 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:ring-indigo-500 focus:bg-white outline-none shadow-sm cursor-pointer transition-colors"
      >
        {SBU_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      
      <select
        value={priorityFilter}
        onChange={(e) => onPriorityChange(e.target.value)}
        className="flex-1 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-8 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:ring-indigo-500 focus:bg-white outline-none shadow-sm cursor-pointer transition-colors"
      >
        {PRIORITY_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
