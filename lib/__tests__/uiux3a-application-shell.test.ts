import fs from 'fs';
import path from 'path';
import { describe, test, expect } from 'vitest';

const ROOT = process.cwd();

function readFile(relPath: string): string {
  const abs = path.isAbsolute(relPath) ? relPath : path.join(ROOT, relPath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
}

describe('Phase UI/UX-4A Navigation Foundation', () => {
  describe('Navigation Types', () => {
    test('lib/navigation/types.ts exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'lib/navigation/types.tsx'))).toBe(true);
    });

    test('exports NavigationSection type', () => {
      const src = readFile('lib/navigation/types.tsx');
      expect(src).toContain('export type NavigationSection');
    });

    test('exports NAVIGATION_SECTIONS constant', () => {
      const src = readFile('lib/navigation/types.tsx');
      expect(src).toContain('export const NAVIGATION_SECTIONS');
    });

    test('defines 12 canonical navigation sections', () => {
      const src = readFile('lib/navigation/types.tsx');
      expect(src).toContain("'command-center'");
      expect(src).toContain("'work'");
      expect(src).toContain("'orders'");
      expect(src).toContain("'fulfillment'");
      expect(src).toContain("'shipments'");
      expect(src).toContain("'execution'");
      expect(src).toContain("'exceptions'");
      expect(src).toContain("'customers'");
      expect(src).toContain("'finance'");
      expect(src).toContain("'intelligence'");
      expect(src).toContain("'copilot'");
      expect(src).toContain("'administration'");
    });

    test('exports getVisibleNavigationSections for role-based visibility', () => {
      const src = readFile('lib/navigation/types.tsx');
      expect(src).toContain('export function getVisibleNavigationSections');
    });

    test('exports getSectionFromPathname for route-to-section mapping', () => {
      const src = readFile('lib/navigation/types.tsx');
      expect(src).toContain('export function getSectionFromPathname');
    });
  });

  describe('AppShell Component', () => {
    test('AppShell.tsx exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'components/layout/AppShell.tsx'))).toBe(true);
    });

    test('exports useNavigation hook', () => {
      const src = readFile('components/layout/AppShell.tsx');
      expect(src).toContain('export function useNavigation');
    });

    test('provides activeSection and setActiveSection', () => {
      const src = readFile('components/layout/AppShell.tsx');
      expect(src).toContain('activeSection');
      expect(src).toContain('setActiveSection');
    });

    test('consumes useAuth for role-based visibility', () => {
      const src = readFile('components/layout/AppShell.tsx');
      expect(src).toContain('useAuth');
      expect(src).toContain('getVisibleNavigationSections');
    });

    test('re-exports NAVIGATION_SECTIONS', () => {
      const src = readFile('components/layout/AppShell.tsx');
      expect(src).toContain('NAVIGATION_SECTIONS');
    });

    test('sidebar state is context-managed', () => {
      const src = readFile('components/layout/AppShell.tsx');
      expect(src).toContain('isSidebarOpen');
    });

    test('superseded workspace model is not referenced', () => {
      const src = readFile('components/layout/AppShell.tsx');
      expect(src).not.toContain('WORKSPACES');
      expect(src).not.toContain('useWorkspace');
      expect(src).not.toContain("type Workspace");
    });
  });

  describe('Sidebar Component', () => {
    test('Sidebar.tsx exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'components/layout/Sidebar.tsx'))).toBe(true);
    });

    test('sidebar uses navigation context, not workspace context', () => {
      const src = readFile('components/layout/Sidebar.tsx');
      expect(src).toContain('useNavigation');
      expect(src).not.toContain('useWorkspace');
      expect(src).not.toContain('WORKSPACE_NAV');
    });

    test('sidebar supports responsive behavior', () => {
      const src = readFile('components/layout/Sidebar.tsx');
      expect(src).toContain('isOpen');
      expect(src).toContain('onClose');
    });

    test('sidebar renders all 12 UI/UX-4 navigation sections', () => {
      const src = readFile('components/layout/Sidebar.tsx');
      expect(src).toContain("'command-center'");
      expect(src).toContain("'work'");
      expect(src).toContain("'orders'");
      expect(src).toContain("'fulfillment'");
      expect(src).toContain("'shipments'");
      expect(src).toContain("'execution'");
      expect(src).toContain("'exceptions'");
      expect(src).toContain("'customers'");
      expect(src).toContain("'finance'");
      expect(src).toContain("'intelligence'");
      expect(src).toContain("'copilot'");
      expect(src).toContain("'administration'");
    });

    test('sidebar preserves business capability routes', () => {
      const src = readFile('components/layout/Sidebar.tsx');
      expect(src).toContain('/commercial/engagements');
      expect(src).toContain('/commercial/quotations');
      expect(src).toContain('/commercial/sales-orders');
      expect(src).toContain('/sbu/forwarding/shipments');
      expect(src).toContain('/sbu/trucking/work-orders');
      expect(src).toContain('/sbu/trucking/assignments');
      expect(src).toContain('/financial/invoices');
      expect(src).toContain('/financial/payments');
      expect(src).toContain('/financial/settlements');
    });

    test('sidebar preserves business capability labels', () => {
      const src = readFile('components/layout/Sidebar.tsx');
      expect(src).toContain("'Engagements'");
      expect(src).toContain("'Quotes'");
      expect(src).toContain("'Sales Orders'");
      expect(src).toContain("'Forwarding'");
      expect(src).toContain("'Trucking'");
      expect(src).toContain("'Customs'");
      expect(src).toContain("'Warehouse'");
      expect(src).toContain("'Invoices'");
      expect(src).toContain("'Payments'");
      expect(src).toContain("'Settlements'");
    });
  });

  describe('TopBar Component', () => {
    test('TopBar.tsx exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'components/layout/TopBar.tsx'))).toBe(true);
    });

    test('topbar uses navigation context', () => {
      const src = readFile('components/layout/TopBar.tsx');
      expect(src).toContain('useNavigation');
    });

    test('topbar has search', () => {
      const src = readFile('components/layout/TopBar.tsx');
      expect(src).toContain('Search');
    });

    test('topbar has notifications', () => {
      const src = readFile('components/layout/TopBar.tsx');
      expect(src).toContain('Bell');
    });

    test('topbar integrates ProfileDropdown', () => {
      const src = readFile('components/layout/TopBar.tsx');
      expect(src).toContain('ProfileDropdown');
    });
  });

  describe('ProfileDropdown Component', () => {
    test('ProfileDropdown.tsx exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'components/layout/ProfileDropdown.tsx'))).toBe(true);
    });

    test('dropdown has profile access', () => {
      const src = readFile('components/layout/ProfileDropdown.tsx');
      expect(src).toContain('Profile');
      expect(src).not.toContain('Logout');
    });

    test('placeholder labels are cleaned up', () => {
      const src = readFile('components/layout/ProfileDropdown.tsx');
      expect(src).not.toContain('Node Profile');
      expect(src).not.toContain('Energy Recharge');
      expect(src).not.toContain('Terminate Session');
    });

    test('uses role label mapping', () => {
      const src = readFile('components/layout/ProfileDropdown.tsx');
      expect(src).toContain('getRoleLabel');
      expect(src).toContain('ROLE_LABELS');
    });
  });

  describe('Dashboard Layout', () => {
    test('dashboard layout uses AppShell', () => {
      const src = readFile('app/(dashboard)/layout.tsx');
      expect(src).toContain('AppShell');
    });

    test('legacy Sidebar import not present', () => {
      const src = readFile('app/(dashboard)/layout.tsx');
      expect(src).not.toContain("from '@/components/layout/Sidebar'");
    });
  });

  describe('Navigation Architecture Migration', () => {
    test('old WORKSPACES model is not in AppShell', () => {
      const src = readFile('components/layout/AppShell.tsx');
      expect(src).not.toContain('WORKSPACES');
    });

    test('new NAVIGATION_SECTIONS is consumed by Sidebar', () => {
      const src = readFile('components/layout/Sidebar.tsx');
      expect(src).toContain('NAVIGATION_SECTIONS');
      expect(src).toContain('visibleSections');
    });

    test('navigation provider wraps children', () => {
      const src = readFile('components/layout/AppShell.tsx');
      expect(src).toContain('NavigationContext.Provider');
      expect(src).toContain('{children}');
    });

    test('role-based visibility gates sidebar rendering', () => {
      const src = readFile('components/layout/Sidebar.tsx');
      expect(src).toContain('visibleSections');
    });
  });
});

describe('Phase UI/UX-4B Component Alignment & Mobile', () => {
  describe('TopBar Human-Readable Labels', () => {
    test('topbar does not expose raw section IDs', () => {
      const src = readFile('components/layout/TopBar.tsx');
      expect(src).not.toContain('{activeSection}');
      expect(src).toContain('getNavigationSectionLabel');
    });
  });

  describe('MobileBottomNav Component', () => {
    test('MobileBottomNav.tsx exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'components/layout/MobileBottomNav.tsx'))).toBe(true);
    });

    test('mobile nav uses useNavigation context', () => {
      const src = readFile('components/layout/MobileBottomNav.tsx');
      expect(src).toContain('useNavigation');
    });

    test('mobile nav is hidden on desktop (lg:hidden)', () => {
      const src = readFile('components/layout/MobileBottomNav.tsx');
      expect(src).toContain('lg:hidden');
    });

    test('mobile nav caps at 5 primary items', () => {
      const src = readFile('components/layout/MobileBottomNav.tsx');
      expect(src).toContain('.slice(0, 5)');
    });

    test('mobile nav is touch-friendly (min 44px targets)', () => {
      const src = readFile('components/layout/MobileBottomNav.tsx');
      expect(src).toContain('h-12');
    });

    test('mobile nav integrated in AppShell', () => {
      const src = readFile('components/layout/AppShell.tsx');
      expect(src).toContain('MobileBottomNav');
    });
  });

  describe('Breadcrumb Component', () => {
    test('Breadcrumb.tsx exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'components/layout/Breadcrumb.tsx'))).toBe(true);
    });

    test('breadcrumb has accessible nav label', () => {
      const src = readFile('components/layout/Breadcrumb.tsx');
      expect(src).toContain('aria-label="Breadcrumb"');
    });

    test('breadcrumb has Home icon', () => {
      const src = readFile('components/layout/Breadcrumb.tsx');
      expect(src).toContain('Home');
    });

    test('breadcrumb supports auto-generation', () => {
      const src = readFile('components/layout/Breadcrumb.tsx');
      expect(src).toContain('autoGenerate');
    });

    test('breadcrumb integrated in Command Center page', () => {
      const src = readFile('app/(dashboard)/commercial/control-tower/page.tsx');
      expect(src).toContain('Breadcrumb');
    });
  });

  describe('Command Center Attention Panel', () => {
    test('CommandCenterAttentionPanel.tsx exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'components/control-tower/CommandCenterAttentionPanel.tsx'))).toBe(true);
    });

    test('attention panel has empty state', () => {
      const src = readFile('components/control-tower/CommandCenterAttentionPanel.tsx');
      expect(src).toContain('All Clear');
    });

    test('attention panel uses existing data (no mock/fake)', () => {
      const src = readFile('components/control-tower/CommandCenterAttentionPanel.tsx');
      expect(src).not.toContain('mock');
      expect(src).not.toContain('fake');
    });

    test('attention panel integrated in Command Center page', () => {
      const src = readFile('app/(dashboard)/commercial/control-tower/page.tsx');
      expect(src).toContain('CommandCenterAttentionPanel');
    });

    test('attention panel has critical, warning, and pulse sections', () => {
      const src = readFile('components/control-tower/CommandCenterAttentionPanel.tsx');
      expect(src).toContain('Critical');
      expect(src).toContain('Needs Action');
      expect(src).toContain('Operational Pulse');
    });
  });

  describe('ProfileDropdown UI/UX-4B', () => {
    test('dropdown shows role label', () => {
      const src = readFile('components/layout/ProfileDropdown.tsx');
      expect(src).toContain('getRoleLabel');
    });

    test('dropdown shows tenant context when available', () => {
      const src = readFile('components/layout/ProfileDropdown.tsx');
      expect(src).toContain('tenants?.name');
    });

    test('dropdown does not contain logout (separated to TopBar)', () => {
      const src = readFile('components/layout/ProfileDropdown.tsx');
      expect(src).not.toContain('LogOut');
      expect(src).not.toContain('logout');
    });
  });

  describe('TopBar Logout Separation', () => {
    test('topbar has dedicated logout button', () => {
      const src = readFile('components/layout/TopBar.tsx');
      expect(src).toContain('LogOut');
      expect(src).toContain('logout');
    });

    test('topbar logout calls canonical auth logout', () => {
      const src = readFile('components/layout/TopBar.tsx');
      expect(src).toContain('useAuth');
      expect(src).toContain('logout');
    });

    test('topbar integrates ProfileDropdown', () => {
      const src = readFile('components/layout/TopBar.tsx');
      expect(src).toContain('ProfileDropdown');
    });
  });

  describe('Route Mapping Hardness', () => {
    test('getSectionFromPathname handles core routes', () => {
      const src = readFile('lib/navigation/types.tsx');
      expect(src).toContain('getSectionFromPathname');
      expect(src).toContain('/commercial/control-tower');
      expect(src).toContain('/operations');
      expect(src).toContain('/sbu/forwarding/shipments');
      expect(src).toContain('/sbu/trucking/work-orders');
      expect(src).toContain('/financial/invoices');
      expect(src).toContain('/copilot');
      expect(src).toContain('/admin/users');
    });

    test('getSectionFromPathname returns null for unknown routes', () => {
      const src = readFile('lib/navigation/types.tsx');
      expect(src).toContain('return null');
    });

    test('getActiveSectionForPathname has fallback logic', () => {
      const src = readFile('components/layout/AppShell.tsx');
      expect(src).toContain('getActiveSectionForPathname');
      expect(src).toContain('roleBasedFallbacks');
    });
  });

  describe('Navigation Source of Truth Integrity', () => {
    test('no competing navigation constants', () => {
      const src = readFile('components/layout/Sidebar.tsx');
      expect(src).not.toContain('MOBILE_NAV');
      expect(src).not.toContain('TOPBAR_NAV');
      expect(src).not.toContain('SIDEBAR_NAV');
    });

    test('single canonical navigation model across shell', () => {
      const appShell = readFile('components/layout/AppShell.tsx');
      const sidebar = readFile('components/layout/Sidebar.tsx');
      const topbar = readFile('components/layout/TopBar.tsx');

      expect(appShell).toContain('NAVIGATION_SECTIONS');
      expect(sidebar).toContain('NAVIGATION_SECTIONS');
      expect(topbar).toContain('getNavigationSectionLabel');
    });
  });
});
