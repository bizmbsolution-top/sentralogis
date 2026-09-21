'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavigation, NAVIGATION_SECTIONS } from './AppShell';
import {
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
  Globe,
  Package,
  Building2,
  ClipboardList,
  Bot,
  AlertTriangle,
  LayoutGrid,
  X,
} from 'lucide-react';
import {
  NavigationSection,
  NavGroup,
} from '@/lib/navigation/types';

const SECTION_NAV: Record<NavigationSection, NavGroup[]> = {
  'command-center': [
    {
      label: 'Attention',
      items: [
        { label: 'Control Tower', href: '/commercial/control-tower', icon: <LayoutGrid className="w-4 h-4" /> },
      ],
    },
  ],
  'work': [
    {
      label: 'Work Queue',
      items: [
        { label: 'Control Tower', href: '/commercial/control-tower', icon: <LayoutGrid className="w-4 h-4" /> },
      ],
    },
  ],
  'orders': [
    {
      label: 'Commercial',
      items: [
        { label: 'Sales Orders', href: '/commercial/sales-orders', icon: <ShoppingCart className="w-4 h-4" /> },
        { label: 'Quotes', href: '/commercial/quotations', icon: <FileText className="w-4 h-4" /> },
        { label: 'Engagements', href: '/commercial/engagements', icon: <Users className="w-4 h-4" /> },
      ],
    },
  ],
  'fulfillment': [
    {
      label: 'Plans',
      items: [
        { label: 'Sales Orders', href: '/commercial/sales-orders', icon: <ShoppingCart className="w-4 h-4" /> },
        { label: 'Consolidations', href: '/sbu/forwarding/consol', icon: <Globe className="w-4 h-4" /> },
      ],
    },
  ],
  'shipments': [
    {
      label: 'Forwarding',
      items: [
        { label: 'Shipments', href: '/sbu/forwarding/shipments', icon: <Ship className="w-4 h-4" /> },
        { label: 'Consolidations', href: '/sbu/forwarding/consol', icon: <Globe className="w-4 h-4" /> },
        { label: 'Documents', href: '/sbu/forwarding/documents', icon: <FileText className="w-4 h-4" /> },
      ],
    },
  ],
  'execution': [
    {
      label: 'Trucking',
      items: [
        { label: 'Work Orders', href: '/sbu/trucking/work-orders', icon: <Truck className="w-4 h-4" /> },
        { label: 'Assignments', href: '/sbu/trucking/assignments', icon: <Package className="w-4 h-4" /> },
        { label: 'Completed', href: '/sbu/trucking/completed', icon: <Package className="w-4 h-4" /> },
      ],
    },
    {
      label: 'Customs',
      items: [
        { label: 'Declarations', href: '/sbu/clearance/declarations', icon: <Shield className="w-4 h-4" /> },
      ],
    },
    {
      label: 'Warehouse',
      items: [
        { label: 'Inbound', href: '/sbu/warehouse/inbound', icon: <Warehouse className="w-4 h-4" /> },
        { label: 'Outbound', href: '/sbu/warehouse/outbound', icon: <Package className="w-4 h-4" /> },
        { label: 'Inventory', href: '/sbu/warehouse/inventory', icon: <Warehouse className="w-4 h-4" /> },
      ],
    },
  ],
  'exceptions': [
    {
      label: 'Alerts',
      items: [
        { label: 'All Exceptions', href: '/director/alerts', icon: <AlertTriangle className="w-4 h-4" /> },
      ],
    },
  ],
  'customers': [
    {
      label: 'Directory',
      items: [
        { label: 'Customers', href: '/hq/customers', icon: <Users className="w-4 h-4" /> },
        { label: 'Engagements', href: '/commercial/engagements', icon: <Users className="w-4 h-4" /> },
        { label: 'Customer Portal', href: '/portal/customer', icon: <Users className="w-4 h-4" /> },
      ],
    },
  ],
  'finance': [
    {
      label: 'Receivables',
      items: [
        { label: 'Invoices', href: '/financial/invoices', icon: <Receipt className="w-4 h-4" /> },
        { label: 'AR Aging', href: '/financial/ar', icon: <DollarSign className="w-4 h-4" /> },
      ],
    },
    {
      label: 'Payables',
      items: [
        { label: 'AP', href: '/financial/ap', icon: <CreditCard className="w-4 h-4" /> },
      ],
    },
    {
      label: 'Transactions',
      items: [
        { label: 'Payments', href: '/financial/payments', icon: <DollarSign className="w-4 h-4" /> },
        { label: 'Settlements', href: '/financial/settlements', icon: <CreditCard className="w-4 h-4" /> },
      ],
    },
  ],
  'intelligence': [
    {
      label: 'Analytics',
      items: [
        { label: 'Visibility', href: '/reporting/operational/overview', icon: <Globe className="w-4 h-4" /> },
        { label: 'Margin', href: '/reporting/finance/margin-waterfall', icon: <DollarSign className="w-4 h-4" /> },
        { label: 'Executive', href: '/reporting/bi/executive', icon: <BarChart3 className="w-4 h-4" /> },
        { label: 'GPS Tracking', href: '/reporting/operational/gps-tracking', icon: <Truck className="w-4 h-4" /> },
      ],
    },
  ],
  'copilot': [
    {
      label: 'Assistant',
      items: [
        { label: 'Copilot', href: '/copilot', icon: <Bot className="w-4 h-4" /> },
      ],
    },
  ],
  'administration': [
    {
      label: 'Settings',
      items: [
        { label: 'Users', href: '/admin/users', icon: <Users className="w-4 h-4" /> },
        { label: 'Settings', href: '/admin/settings', icon: <Settings className="w-4 h-4" /> },
      ],
    },
    {
      label: 'Master Data',
      items: [
        { label: 'Locations', href: '/hq/master/locations', icon: <Globe className="w-4 h-4" /> },
        { label: 'Drivers', href: '/hq/master/drivers', icon: <Truck className="w-4 h-4" /> },
        { label: 'Fleets', href: '/hq/master/fleets', icon: <Truck className="w-4 h-4" /> },
        { label: 'Services', href: '/hq/master/services', icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ],
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { visibleSections } = useNavigation();
  const pathname = usePathname();

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:border-r-0'
        }`}
      >
        {!isOpen && (
          <div className="fixed lg:static inset-y-0 left-0 z-40 w-16 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 lg:flex lg:flex-col lg:py-4 lg:gap-2 hidden">
            {visibleSections.map((section) => {
              const def = NAVIGATION_SECTIONS.find((d) => d.id === section);
              if (!def) return null;
              const isActive = pathname === def.href || pathname.startsWith(def.href + '/');
              return (
                <Link
                  key={def.id}
                  href={def.href}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg mx-2 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title={def.label}
                >
                  {def.icon}
                  <span>{def.label}</span>
                </Link>
              );
            })}
          </div>
        )}

        {isOpen && (
          <>
            <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800">              <Link href="/" className="flex items-center gap-2 font-bold text-lg text-slate-900 dark:text-white">
                <Building2 className="w-6 h-6 text-blue-600" />
                Sentralogis
              </Link>
              <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
              {visibleSections.map((section) => {
                const def = NAVIGATION_SECTIONS.find((d) => d.id === section);
                if (!def) return null;

                const groups = SECTION_NAV[section] || [];
                const sectionActive = groups.some((g) =>
                  g.items.some((item) => pathname === item.href || pathname.startsWith(item.href + '/'))
                );

                return (
                  <div key={def.id} className="mb-4">
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        sectionActive
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {def.icon}
                      <span>{def.label}</span>
                    </div>
                    <div className="ml-6 mt-1 space-y-0.5">
                      {groups.map((group) => (
                        <div key={group.label} className="mb-2">
                          <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
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
                    </div>
                  </div>
                );
              })}
            </nav>
          </>
        )}
      </aside>
    </>
  );
}
