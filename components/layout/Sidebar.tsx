'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWorkspace, WORKSPACES, Workspace } from './AppShell';
import {
  Home,
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
  X,
  ChevronRight,
  Globe,
  Package,
  Building2,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const WORKSPACE_NAV: Record<Workspace, NavGroup[]> = {
  commercial: [
    { label: 'Overview', items: [{ label: 'Dashboard', href: '/commercial', icon: <Home className="w-4 h-4" /> }] },
    { label: 'Customer', items: [
      { label: 'Engagements', href: '/commercial/engagements', icon: <Users className="w-4 h-4" /> },
      { label: 'Quotes', href: '/commercial/quotations', icon: <FileText className="w-4 h-4" /> },
      { label: 'Sales Orders', href: '/commercial/sales-orders', icon: <ShoppingCart className="w-4 h-4" /> },
    ]},
  ],
  operations: [
    { label: 'Overview', items: [{ label: 'Work Queue', href: '/operations', icon: <Package className="w-4 h-4" /> }] },
    { label: 'Forwarding', items: [
      { label: 'Shipments', href: '/operations/forwarding/shipments', icon: <Ship className="w-4 h-4" /> },
      { label: 'Consolidations', href: '/operations/forwarding/consolidations', icon: <Globe className="w-4 h-4" /> },
    ]},
    { label: 'Trucking', items: [
      { label: 'Work Orders', href: '/operations/trucking/work-orders', icon: <Truck className="w-4 h-4" /> },
      { label: 'Assignments', href: '/operations/trucking/assignments', icon: <Package className="w-4 h-4" /> },
    ]},
    { label: 'Customs', items: [
      { label: 'Declarations', href: '/operations/customs/declarations', icon: <Shield className="w-4 h-4" /> },
    ]},
    { label: 'Warehouse', items: [
      { label: 'Inbound', href: '/operations/warehouse/inbound', icon: <Warehouse className="w-4 h-4" /> },
      { label: 'Outbound', href: '/operations/warehouse/outbound', icon: <Package className="w-4 h-4" /> },
    ]},
  ],
  finance: [
    { label: 'Overview', items: [{ label: 'Dashboard', href: '/finance', icon: <BarChart3 className="w-4 h-4" /> }] },
    { label: 'Receivables', items: [
      { label: 'Invoices', href: '/financial/invoices', icon: <Receipt className="w-4 h-4" /> },
      { label: 'AR', href: '/financial/ar', icon: <DollarSign className="w-4 h-4" /> },
    ]},
    { label: 'Payables', items: [
      { label: 'AP', href: '/financial/ap', icon: <CreditCard className="w-4 h-4" /> },
    ]},
    { label: 'Transactions', items: [
      { label: 'Payments', href: '/financial/payments', icon: <DollarSign className="w-4 h-4" /> },
      { label: 'Settlements', href: '/financial/settlements', icon: <CreditCard className="w-4 h-4" /> },
    ]},
  ],
  intelligence: [
    { label: 'Overview', items: [{ label: 'Dashboard', href: '/intelligence', icon: <BarChart3 className="w-4 h-4" /> }] },
    { label: 'Analytics', items: [
      { label: 'Visibility', href: '/intelligence/visibility', icon: <Globe className="w-4 h-4" /> },
      { label: 'Margin', href: '/intelligence/margin', icon: <DollarSign className="w-4 h-4" /> },
    ]},
  ],
  admin: [
    { label: 'Overview', items: [{ label: 'Dashboard', href: '/admin', icon: <Settings className="w-4 h-4" /> }] },
    { label: 'Management', items: [
      { label: 'Users', href: '/admin/users', icon: <Users className="w-4 h-4" /> },
      { label: 'Settings', href: '/admin/settings', icon: <Settings className="w-4 h-4" /> },
    ]},
  ],
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { activeWorkspace } = useWorkspace();
  const pathname = usePathname();
  const navGroups = WORKSPACE_NAV[activeWorkspace];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-slate-900 dark:text-white">
            <Building2 className="w-6 h-6 text-blue-600" />
            Sentralogis
          </Link>
          <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {group.label}
              </div>
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                    {item.badge && (
                      <span className="ml-auto px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
