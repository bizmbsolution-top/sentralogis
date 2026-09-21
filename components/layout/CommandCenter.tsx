'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Command,
  Package,
  Users,
  FileText,
  ShoppingCart,
  Truck,
  Ship,
  Shield,
  Warehouse,
  DollarSign,
  Receipt,
  CreditCard,
  BarChart3,
  Settings,
  Bell,
  User,
  ChevronRight,
  Clock,
  Zap,
  X,
} from 'lucide-react';

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: string;
  href?: string;
  action?: () => void;
}

export interface CommandCategory {
  id: string;
  label: string;
  items: CommandItem[];
}

const NAV_ITEMS: CommandCategory[] = [
  {
    id: 'commercial',
    label: 'Commercial',
    items: [
      { id: 'engagements', label: 'Engagements', icon: <Users className="w-4 h-4" />, category: 'Commercial', href: '/commercial/engagements' },
      { id: 'quotes', label: 'Quotes', icon: <FileText className="w-4 h-4" />, category: 'Commercial', href: '/commercial/quotations' },
      { id: 'sales-orders', label: 'Sales Orders', icon: <ShoppingCart className="w-4 h-4" />, category: 'Commercial', href: '/commercial/sales-orders' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
       { id: 'forwarding', label: 'Forwarding', icon: <Ship className="w-4 h-4" />, category: 'Operations', href: '/sbu/forwarding/shipments' },
       { id: 'trucking', label: 'Trucking', icon: <Truck className="w-4 h-4" />, category: 'Operations', href: '/sbu/trucking/work-orders' },
       { id: 'customs', label: 'Customs', icon: <Shield className="w-4 h-4" />, category: 'Operations', href: '/sbu/clearance/declarations' },
       { id: 'warehouse', label: 'Warehouse', icon: <Warehouse className="w-4 h-4" />, category: 'Operations', href: '/sbu/warehouse/inbound' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { id: 'invoices', label: 'Invoices', icon: <Receipt className="w-4 h-4" />, category: 'Finance', href: '/financial/invoices' },
      { id: 'payments', label: 'Payments', icon: <DollarSign className="w-4 h-4" />, category: 'Finance', href: '/financial/payments' },
      { id: 'ar', label: 'Accounts Receivable', icon: <CreditCard className="w-4 h-4" />, category: 'Finance', href: '/financial/ar' },
      { id: 'ap', label: 'Accounts Payable', icon: <CreditCard className="w-4 h-4" />, category: 'Finance', href: '/financial/ap' },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing',
    items: [
      { id: 'rate-masters', label: 'Rate Masters', icon: <BarChart3 className="w-4 h-4" />, category: 'Pricing', href: '/pricing/rate-masters' },
      { id: 'overrides', label: 'Overrides', icon: <Settings className="w-4 h-4" />, category: 'Pricing', href: '/pricing/overrides' },
    ],
  },
];

const QUICK_ACTIONS: CommandItem[] = [
  { id: 'new-quote', label: 'New Quote', icon: <FileText className="w-4 h-4" />, category: 'Quick', href: '/commercial/quotations/create' },
  { id: 'new-so', label: 'New Sales Order', icon: <ShoppingCart className="w-4 h-4" />, category: 'Quick', href: '/commercial/sales-orders/create' },
  { id: 'find-shipment', label: 'Find Shipment', icon: <Search className="w-4 h-4" />, category: 'Quick' },
  { id: 'record-payment', label: 'Record Payment', icon: <DollarSign className="w-4 h-4" />, category: 'Quick', href: '/financial/payments' },
];

export default function CommandCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const allItems = [...QUICK_ACTIONS, ...NAV_ITEMS.flatMap((c) => c.items)];
  const filteredItems = query
    ? allItems.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = useCallback((item: CommandItem) => {
    if (item.href) window.location.href = item.href;
    if (item.action) item.action();
    setIsOpen(false);
    setQuery('');
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="hidden md:inline">Search...</span>
        <kbd className="hidden md:inline ml-auto px-1.5 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 rounded">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Search or type a command..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none"
          />
          <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filteredItems.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-slate-400">No results found</div>
          )}
          {filteredItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="text-slate-500">{item.icon}</div>
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</div>
                {item.description && <div className="text-xs text-slate-400">{item.description}</div>}
              </div>
              <span className="ml-auto text-xs text-slate-400">{item.category}</span>
            </button>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-4 text-xs text-slate-400">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
