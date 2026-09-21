'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { useNavigation } from '@/components/layout/AppShell';
import { getNavigationSectionLabel } from '@/lib/navigation/types';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  autoGenerate?: boolean;
  className?: string;
  maxItems?: number;
}

const ROUTE_LABEL_MAP: Record<string, string> = {
  '/commercial': 'Commercial',
  '/commercial/sales-orders': 'Orders',
  '/commercial/quotations': 'Quotes',
  '/commercial/engagements': 'Customers',
  '/commercial/leads': 'Leads',
  '/commercial/pipeline': 'Pipeline',
  '/sbu/forwarding/shipments': 'Shipments',
  '/sbu/forwarding/consol': 'Consolidations',
  '/sbu/forwarding/wo': 'Forwarding',
  '/sbu/trucking/work-orders': 'Work Orders',
  '/sbu/trucking/assignments': 'Assignments',
  '/sbu/trucking/completed': 'Completed',
  '/sbu/clearance/declarations': 'Customs',
  '/sbu/warehouse/inbound': 'Inbound',
  '/sbu/warehouse/outbound': 'Outbound',
  '/financial/invoices': 'Invoices',
  '/financial/ar': 'AR Aging',
  '/financial/ap': 'AP',
  '/financial/payments': 'Payments',
  '/financial/settlements': 'Settlements',
  '/reporting': 'Reporting',
  '/reporting/operational/overview': 'Visibility',
  '/reporting/bi/executive': 'Executive',
  '/copilot': 'Copilot',
  '/admin': 'Admin',
  '/admin/users': 'Users',
  '/admin/settings': 'Settings',
  '/tenant': 'Tenant',
  '/owner': 'Owner',
};

function generateBreadcrumbs(pathname: string, activeSection: string | null): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [{ label: 'Home', href: '/', icon: <Home className="w-4 h-4" /> }];

  let accumulatedPath = '';

  if (segments[0] === 'commercial' && segments[1] === 'control-tower') {
    items.push({ label: 'Command Center', href: '/commercial/control-tower' });
    if (segments[2]) {
      items.push({ label: segments[2] });
    }
    return items;
  }

  if (segments[0] === 'sbu') {
    if (segments[1] === 'forwarding') {
      items.push({ label: 'Shipments', href: '/sbu/forwarding/shipments' });
      if (segments[2] === 'consol') items.push({ label: 'Consolidations', href: '/sbu/forwarding/consol' });
      if (segments[2] === 'wo') items.push({ label: 'Forwarding WOs', href: '/sbu/forwarding/wo' });
    }
    if (segments[1] === 'trucking') {
      items.push({ label: 'Execution', href: '/sbu/trucking/work-orders' });
      if (segments[2] === 'work-orders') items.push({ label: 'Work Orders', href: '/sbu/trucking/work-orders' });
      if (segments[2] === 'assignments') items.push({ label: 'Assignments', href: '/sbu/trucking/assignments' });
    }
    if (segments[1] === 'clearance') items.push({ label: 'Customs', href: '/sbu/clearance/declarations' });
    if (segments[1] === 'warehouse') items.push({ label: 'Warehouse' });
    return items;
  }

  for (let i = 0; i < segments.length; i++) {
    accumulatedPath += `/${segments[i]}`;
    const isLast = i === segments.length - 1;
    const segmentLabel = (i >= 2 && /^\[/.test(segments[i]))
      ? segments[i].replace(/[\[\]]/g, '').replace(/-/g, ' ')
      : ROUTE_LABEL_MAP[accumulatedPath] || segments[i].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    if (!isLast && ROUTE_LABEL_MAP[accumulatedPath]) {
      items.push({ label: segmentLabel, href: accumulatedPath });
    } else if (isLast) {
      items.push({ label: segmentLabel });
    }
  }

  return items;
}

export function Breadcrumb({ items, autoGenerate = true, className = '', maxItems = 5 }: BreadcrumbProps) {
  const pathname = usePathname();
  const { activeSection } = useNavigation();

  const breadcrumbItems = useMemo(() => {
    if (items) return items;
    if (!autoGenerate) return [];
    return generateBreadcrumbs(pathname, activeSection);
  }, [items, autoGenerate, pathname, activeSection]);

  const displayItems = breadcrumbItems.length > maxItems
    ? [breadcrumbItems[0], { label: '...', href: undefined }, ...breadcrumbItems.slice(-(maxItems - 2))]
    : breadcrumbItems;

  if (displayItems.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 mb-4 ${className}`}
    >
      {displayItems.map((item, index) => {
        const isLast = index === displayItems.length - 1;
        return (
          <div key={index} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="w-3 h-3 text-slate-400" />}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex items-center gap-1"
              >
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                {item.icon}
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export function useBreadcrumbItems(pathname: string, activeSection: string | null): BreadcrumbItem[] {
  return generateBreadcrumbs(pathname, activeSection);
}
