'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavigation } from '@/components/layout/AppShell';
import { getNavigationSectionLabel } from '@/lib/navigation/types';
import {
  LayoutGrid,
  ClipboardList,
  ShoppingCart,
  Ship,
  Truck,
  AlertTriangle,
  Users,
  DollarSign,
  BarChart3,
  Bot,
  Settings,
  Package,
} from 'lucide-react';

interface MobileNavItem {
  id: string;
  icon: React.ReactNode;
  href: string;
  matchPattern?: (pathname: string) => boolean;
}

const SECTION_HREF_MAP: Record<string, string> = {
  'command-center': '/commercial/control-tower',
  'work': '/commercial/control-tower',
  'orders': '/commercial/sales-orders',
  'fulfillment': '/commercial/sales-orders',
  'shipments': '/sbu/forwarding/shipments',
  'execution': '/sbu/trucking/work-orders',
  'exceptions': '/director/alerts',
  'customers': '/commercial/engagements',
  'finance': '/financial/invoices',
  'intelligence': '/reporting/operational/overview',
  'copilot': '/copilot',
  'administration': '/admin/users',
};

const MOBILE_NAV_PRIORITY: MobileNavItem[] = [
  { id: 'command-center', icon: <LayoutGrid className="w-5 h-5" />, href: SECTION_HREF_MAP['command-center'] },
  { id: 'work', icon: <ClipboardList className="w-5 h-5" />, href: SECTION_HREF_MAP['work'] },
  { id: 'orders', icon: <ShoppingCart className="w-5 h-5" />, href: SECTION_HREF_MAP['orders'] },
  { id: 'shipments', icon: <Ship className="w-5 h-5" />, href: SECTION_HREF_MAP['shipments'] },
  { id: 'execution', icon: <Truck className="w-5 h-5" />, href: SECTION_HREF_MAP['execution'] },
  { id: 'exceptions', icon: <AlertTriangle className="w-5 h-5" />, href: SECTION_HREF_MAP['exceptions'] },
  { id: 'customers', icon: <Users className="w-5 h-5" />, href: SECTION_HREF_MAP['customers'] },
  { id: 'finance', icon: <DollarSign className="w-5 h-5" />, href: SECTION_HREF_MAP['finance'] },
  { id: 'intelligence', icon: <BarChart3 className="w-5 h-5" />, href: SECTION_HREF_MAP['intelligence'] },
  { id: 'copilot', icon: <Bot className="w-5 h-5" />, href: SECTION_HREF_MAP['copilot'] },
  { id: 'administration', icon: <Settings className="w-5 h-5" />, href: SECTION_HREF_MAP['administration'] },
  { id: 'fulfillment', icon: <Package className="w-5 h-5" />, href: SECTION_HREF_MAP['fulfillment'] },
];

export default function MobileBottomNav() {
  const { visibleSections, activeSection } = useNavigation();
  const pathname = usePathname();

  const visiblePriorityItems = MOBILE_NAV_PRIORITY.filter((item) =>
    visibleSections.includes(item.id as any)
  ).slice(0, 5);

  if (visiblePriorityItems.length === 0) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex lg:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around flex-1 h-14">
        {visiblePriorityItems.map((item) => {
          const isActive = activeSection === item.id;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-12 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {item.icon}
              <span className="mt-1">{getNavigationSectionLabel(item.id)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
