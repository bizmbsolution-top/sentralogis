'use client';

import React from 'react';
import {
  LayoutGrid,
  ClipboardList,
  ShoppingCart,
  Package,
  Ship,
  Truck,
  AlertTriangle,
  Users,
  DollarSign,
  BarChart3,
  Bot,
  Settings,
} from 'lucide-react';

export type NavigationSection =
  | 'command-center'
  | 'work'
  | 'orders'
  | 'fulfillment'
  | 'shipments'
  | 'execution'
  | 'exceptions'
  | 'customers'
  | 'finance'
  | 'intelligence'
  | 'copilot'
  | 'administration';

export interface NavigationSectionDefinition {
  id: NavigationSection;
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  requiredRolePrefix?: string[];
}

export const NAVIGATION_SECTIONS: NavigationSectionDefinition[] = [
  {
    id: 'command-center',
    label: 'Command Center',
    description: 'What needs your attention',
    icon: <LayoutGrid className="w-5 h-5" />,
    href: '/commercial/control-tower',
  },
  {
    id: 'work',
    label: 'Work',
    description: 'Work queue across all SBUs',
    icon: <ClipboardList className="w-5 h-5" />,
    href: '/commercial/sales-orders',
  },
  {
    id: 'orders',
    label: 'Orders',
    description: 'Sales orders and quotations',
    icon: <ShoppingCart className="w-5 h-5" />,
    href: '/commercial/sales-orders',
  },
  {
    id: 'fulfillment',
    label: 'Fulfillment',
    description: 'Fulfillment plans and allocations',
    icon: <Package className="w-5 h-5" />,
    href: '/commercial/sales-orders',
  },
  {
    id: 'shipments',
    label: 'Shipments',
    description: 'Forwarding and shipping movements',
    icon: <Ship className="w-5 h-5" />,
    href: '/sbu/forwarding/shipments',
  },
  {
    id: 'execution',
    label: 'Execution',
    description: 'Job orders and assignments',
    icon: <Truck className="w-5 h-5" />,
    href: '/sbu/trucking/work-orders',
  },
  {
    id: 'exceptions',
    label: 'Exceptions',
    description: 'Alerts and risk exceptions',
    icon: <AlertTriangle className="w-5 h-5" />,
    href: '/director/alerts',
  },
  {
    id: 'customers',
    label: 'Customers',
    description: 'Customer and engagement directory',
    icon: <Users className="w-5 h-5" />,
    href: '/commercial/engagements',
  },
  {
    id: 'finance',
    label: 'Finance',
    description: 'Invoices, payments, and receivables',
    icon: <DollarSign className="w-5 h-5" />,
    href: '/financial/invoices',
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    description: 'Analytics and reporting',
    icon: <BarChart3 className="w-5 h-5" />,
    href: '/reporting/operational/overview',
  },
  {
    id: 'copilot',
    label: 'Copilot',
    description: 'AI assistance',
    icon: <Bot className="w-5 h-5" />,
    href: '/copilot',
  },
  {
    id: 'administration',
    label: 'Administration',
    description: 'Users, roles, and settings',
    icon: <Settings className="w-5 h-5" />,
    href: '/admin/users',
  },
];

export const NAVIGATION_SECTIONS_BY_ID: Record<string, NavigationSectionDefinition> =
  NAVIGATION_SECTIONS.reduce((acc, section) => {
    acc[section.id] = section;
    return acc;
  }, {} as Record<string, NavigationSectionDefinition>);

export function getNavigationSection(
  section: NavigationSection | string | null | undefined
): NavigationSectionDefinition | undefined {
  if (!section) return undefined;
  return NAVIGATION_SECTIONS_BY_ID[section];
}

export function getNavigationSectionLabel(
  section: NavigationSection | string | null | undefined
): string {
  return getNavigationSection(section)?.label || 'Dashboard';
}

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export function getVisibleNavigationSections(
  role: string | null | undefined
): NavigationSection[] {
  if (!role) return [];

  const all: NavigationSection[] = [
    'command-center',
    'work',
    'orders',
    'fulfillment',
    'shipments',
    'execution',
    'exceptions',
    'customers',
    'finance',
    'intelligence',
    'copilot',
    'administration',
  ];

  if (role === 'owner_sentralogis') return all;
  if (role === 'tenant_superadmin' || role === 'tenant_admin') return all;

  if (role.startsWith('hq_')) {
    return all.filter((s) => s !== 'administration');
  }

  if (role.startsWith('sbu_')) {
    if (role.includes('fwd') || role.includes('forwarding')) {
      return ['work', 'fulfillment', 'shipments', 'intelligence'];
    }
    if (role.includes('tr')) {
      return ['work', 'execution', 'shipments', 'intelligence'];
    }
    if (role.includes('wh')) {
      return ['work', 'execution', 'customers', 'intelligence'];
    }
    return ['work', 'intelligence'];
  }

  if (role === 'warehouse_customer') {
    return ['customers', 'orders'];
  }

  if (role === 'ground_staff') {
    return ['work', 'customers'];
  }

  return ['command-center', 'work', 'orders', 'customers'];
}

export function getSectionFromPathname(pathname: string): NavigationSection | null {
  const mappings: Array<[RegExp, NavigationSection]> = [
    [/^\/commercial\/control-tower/, 'command-center'],
    [/^\/(?:commercial\/sales-orders|commercial\/quotations|commercial\/leads|commercial\/pipeline)/, 'orders'],
    [/^\/commercial\/sales-orders\/[^/]+\/fulfillment/, 'fulfillment'],
    [/^\/(?:sbu\/forwarding\/shipments|sbu\/forwarding\/consol)/, 'shipments'],
    [/^\/(?:sbu\/trucking\/work-orders|sbu\/trucking\/assignments|hq\/work-orders)/, 'execution'],
    [/^\/(?:director\/alerts|intelligence\/exceptions)/, 'exceptions'],
    [/^\/(?:commercial\/engagements|hq\/customers|hq\/requests|customer)/, 'customers'],
    [/^\/(?:financial\/|hq\/finance|reporting\/finance)/, 'finance'],
    [/^\/(?:intelligence|reporting\/bi|reporting\/operational|director\/(ops|cs|fin|bizdev|hrd|sbu|token|pl)|hq\/fleet-performance|hq\/driver-performance)/, 'intelligence'],
    [/^\/copilot/, 'copilot'],
    [/^\/(?:admin|owner\/(users|settings|tenants|observability))/, 'administration'],
  ];

  for (const [regex, section] of mappings) {
    if (regex.test(pathname)) return section;
  }

  return null;
}
