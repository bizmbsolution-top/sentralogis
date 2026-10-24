'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavigation, NAVIGATION_SECTIONS } from './AppShell';
import { useAuth } from '@/lib/hooks/useAuth';
import { getDashboardRoute } from '@/lib/utils/dashboardRoute';
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
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import {
  canSeeAdminSettings,
  canAccessAnyMasterData,
  masterDataCategoriesForPath,
} from '@/lib/application/identity/master-data-guard';
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
        { label: 'Job Orders', href: '/hq/job-orders', icon: <ClipboardList className="w-4 h-4" /> },
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
        { label: 'Copilot', href: '/copilot/v2', icon: <Bot className="w-4 h-4" /> },
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
        { label: 'Customers', href: '/tenant/master/contacts', icon: <Users className="w-4 h-4" /> },
        { label: 'Vendors', href: '/tenant/master/transporters', icon: <Building2 className="w-4 h-4" /> },
        { label: 'Drivers', href: '/hq/master/drivers', icon: <Truck className="w-4 h-4" /> },
        { label: 'Fleets', href: '/hq/master/fleets', icon: <Truck className="w-4 h-4" /> },
        { label: 'Locations', href: '/hq/master/locations', icon: <Globe className="w-4 h-4" /> },
        { label: 'Taxes', href: '/hq/finance/tax-management', icon: <Receipt className="w-4 h-4" /> },
        { label: 'Services', href: '/hq/master/services', icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ],
};

/**
 * Visual grouping of the canonical NavigationSection ids (lib/navigation/types.tsx).
 * Purely presentational: visibility/permission is still decided ONLY by
 * `visibleSections` (getVisibleNavigationSections) from AppShell.
 */
const NAV_CATEGORIES: Array<{ label: string; sections: NavigationSection[] }> = [
  { label: 'Workspace', sections: ['command-center', 'work'] },
  { label: 'Operations', sections: ['orders', 'fulfillment', 'shipments', 'execution', 'exceptions'] },
  { label: 'Business', sections: ['customers', 'finance', 'intelligence'] },
  { label: 'Assistant', sections: ['copilot'] },
  { label: 'Administration', sections: ['administration'] },
];

interface ResolvedSection {
  id: NavigationSection;
  groups: NavGroup[];
}

const isRouteActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + '/');

/**
 * Resolve the sections a user may see into a de-duplicated render model.
 * An item whose href was already rendered by an earlier visible section is
 * skipped (same destination = same function). Because only sections the role
 * can see are considered, no role loses access to a destination.
 */
export function resolveSections(visible: NavigationSection[], role?: string | null): ResolvedSection[] {
  const seen = new Set<string>();
  const result: ResolvedSection[] = [];
  for (const cat of NAV_CATEGORIES) {
    for (const id of cat.sections) {
      if (!visible.includes(id)) continue;
      const groups: NavGroup[] = [];
      for (const g of SECTION_NAV[id] || []) {
        if (id === 'administration' && g.label === 'Settings' && !canSeeAdminSettings(role)) {
          continue;
        }

        const items = g.items.filter((item) => {
          if (id === 'administration' && g.label === 'Master Data') {
            const categories = masterDataCategoriesForPath(item.href);
            if (categories && !canAccessAnyMasterData(role, categories, 'read')) {
              return false;
            }
          }
          if (seen.has(item.href)) return false;
          seen.add(item.href);
          return true;
        });
        if (items.length > 0) groups.push({ label: g.label, items });
      }
      if (groups.length > 0) result.push({ id, groups });
    }
  }
  return result;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { visibleSections, setSidebarOpen, role } = useNavigation();
  const { profile } = useAuth();
  const pathname = usePathname();

  const sections = React.useMemo(() => resolveSections(visibleSections, role), [visibleSections, role]);

  const activeSectionId = sections.find((s) =>
    s.groups.some((g) => g.items.some((item) => isRouteActive(pathname, item.href)))
  )?.id;

  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({ administration: true });

  // Keep the section that contains the current route expanded across navigation / mode switches.
  React.useEffect(() => {
    if (activeSectionId) {
      setExpanded((prev) => (prev[activeSectionId] ? prev : { ...prev, [activeSectionId]: true }));
    }
  }, [activeSectionId]);

  const closeIfMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) onClose();
  };

  const brandHref = getDashboardRoute(profile?.role || '');


  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Single global sidebar */}
      <aside
        aria-label="Primary navigation"
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-[#0B132B] text-slate-300 border-r border-slate-800/80 shadow-2xl lg:shadow-none transition-all duration-300 ease-in-out ${
          isOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-16'
        }`}
      >
        {/* Header: branding + the single desktop collapse/expand control */}
        <div className="flex items-center justify-between h-16 px-3.5 border-b border-slate-800/80 shrink-0">
          {isOpen ? (
            <>
              <Link
                href={brandHref}
                aria-label="Sentralogis OS home"
                className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
                onClick={closeIfMobile}
              >
                <img
                  src="/logosentralogis.png"
                  alt="Sentralogis OS"
                  className="h-8 w-auto object-contain shrink-0"
                />
                <div className="flex flex-col">
                  <span className="font-extrabold text-sm tracking-wide text-white leading-tight">SENTRALOGIS</span>
                  <span className="text-[10px] text-blue-400 font-medium tracking-widest uppercase">Operating System</span>
                </div>
              </Link>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  title="Ciutkan sidebar"
                  aria-label="Collapse sidebar"
                  className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close sidebar"
                  className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              title="Perluas sidebar"
              aria-label="Expand sidebar"
              className="hidden lg:flex mx-auto p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tenant branding badge when expanded */}
        {isOpen && profile?.tenants?.name && (
          <div className="mx-3 my-2 px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center gap-2">
            {profile.tenants.logo_url ? (
              <img
                src={profile.tenants.logo_url}
                alt={profile.tenants.name}
                className="w-5 h-5 rounded object-contain bg-white/10 shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-5 h-5 rounded bg-blue-600/20 text-blue-400 flex items-center justify-center text-[9px] font-bold shrink-0">
                {profile.tenants.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-slate-200 truncate leading-tight">
                {profile.tenants.name}
              </span>
              <span className="text-[9px] text-slate-500 font-mono leading-none">
                {profile.tenants.tenant_code || profile.tenant_code || 'TENANT'}
              </span>
            </div>
          </div>
        )}

        {/* Collapsed desktop icon rail */}
        {!isOpen && (
          <div className="hidden lg:flex flex-col items-center py-3 gap-1.5 overflow-y-auto flex-1 w-full">
            {sections.map((section) => {
              const def = NAVIGATION_SECTIONS.find((d) => d.id === section.id);
              if (!def) return null;
              const isActive = activeSectionId === section.id;
              const target = section.groups[0].items[0].href;
              return (
                <Link
                  key={def.id}
                  href={target}
                  aria-label={def.label}
                  title={def.label}
                  className={`group relative flex items-center justify-center w-10 h-10 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  {def.icon}
                  <span className="absolute left-12 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-xl border border-slate-700 pointer-events-none opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity whitespace-nowrap z-50">
                    {def.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Expanded navigation (desktop expanded + mobile drawer) */}
        {isOpen && (
          <nav className="flex-1 px-3 py-3 overflow-y-auto custom-scrollbar" aria-label="Global navigation">
            {NAV_CATEGORIES.map((cat) => {
              const catSections = sections.filter((s) => cat.sections.includes(s.id));
              if (catSections.length === 0) return null;

              // Hide redundant uppercase category label if it duplicates the only section inside it (e.g. Administration)
              const isRedundantCategoryHeading =
                catSections.length === 1 &&
                cat.label.toLowerCase() ===
                  NAVIGATION_SECTIONS.find((d) => d.id === catSections[0].id)?.label.toLowerCase();

              return (
                <div key={cat.label} className="mb-4 last:mb-0">
                  {!isRedundantCategoryHeading && (
                    <div className="px-3 pb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                      {cat.label}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {catSections.map((section) => {
                      const def = NAVIGATION_SECTIONS.find((d) => d.id === section.id);
                      if (!def) return null;
                      const isActive = activeSectionId === section.id;
                      const isExpanded = !!expanded[section.id];
                      return (
                        <div key={section.id}>
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            aria-controls={`nav-sub-${section.id}`}
                            onClick={() => setExpanded((prev) => ({ ...prev, [section.id]: !prev[section.id] }))}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                              isActive
                                ? 'text-white bg-slate-800/70'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                            }`}
                          >
                            <span className={`[&>svg]:w-4 [&>svg]:h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`}>
                              {def.icon}
                            </span>
                            <span className="flex-1 text-left truncate">{def.label}</span>
                            <ChevronRight
                              className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            />
                          </button>

                          {isExpanded && (
                            <div
                              id={`nav-sub-${section.id}`}
                              className="ml-5 mt-0.5 mb-1 pl-3 border-l border-slate-800 space-y-2"
                            >
                              {section.groups.map((group) => (
                                <div key={group.label} className="space-y-0.5">
                                  {(section.groups.length > 1 || section.id === 'administration') && (
                                    <div className="px-2.5 pt-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                      {group.label}
                                    </div>
                                  )}
                                  {group.items.map((item) => {
                                    const itemActive = isRouteActive(pathname, item.href);
                                    return (
                                      <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={closeIfMobile}
                                        aria-current={itemActive ? 'page' : undefined}
                                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                          itemActive
                                            ? 'bg-blue-600 text-white font-semibold'
                                            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                                        }`}
                                      >
                                        <span className={itemActive ? 'text-white' : 'text-slate-500'}>{item.icon}</span>
                                        <span className="truncate">{item.label}</span>
                                        {item.badge && (
                                          <span className="ml-auto px-1.5 text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full font-semibold">
                                            {item.badge}
                                          </span>
                                        )}
                                      </Link>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        )}
      </aside>
    </>
  );
}
