import fs from 'fs';
import { vi, describe, test, expect } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  })),
}));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

import {
  MASTER_DATA_CATEGORIES,
  CS_MASTER_DATA_CATEGORIES,
  MASTER_DATA_FULL_GRANT,
  MASTER_DATA_CS_GRANT,
  masterDataPermission,
  type MasterDataCategory,
  type MasterDataAction,
} from '@/lib/application/identity/master-data-permissions';
import {
  ROLE_OWNER,
  ROLE_TENANT_SUPERADMIN,
  ROLE_TENANT_ADMIN,
  ROLE_HQ_CS,
} from '@/lib/application/identity/roles';
import { resolvePermissionsForRole } from '@/lib/application/identity/authorization';
import {
  canAccessMasterData,
  canAccessAnyMasterData,
  canSeeAdminSettings,
  masterDataCategoriesForPath,
  assertMasterDataAccess,
  getMasterDataAccessMode,
} from '@/lib/application/identity/master-data-guard';
import { getVisibleNavigationSections, NavigationSection } from '@/lib/navigation/types';
import { resolveSections } from '@/components/layout/Sidebar';

describe('Master Data Permission & Navigation Gates', () => {
  describe('Permission Matrix Configuration', () => {
    test('defines exact 7 categories and 6 CS categories', () => {
      expect(MASTER_DATA_CATEGORIES).toHaveLength(7);
      expect(CS_MASTER_DATA_CATEGORIES).toHaveLength(6);
      expect(CS_MASTER_DATA_CATEGORIES).not.toContain('other');
      expect(CS_MASTER_DATA_CATEGORIES).toEqual([
        'customers',
        'vendors',
        'drivers',
        'fleet',
        'locations',
        'taxes',
      ]);
    });

    test('CS grant includes only read and write for the 6 categories (no delete, no other)', () => {
      expect(MASTER_DATA_CS_GRANT).toHaveLength(12); // 6 * 2
      for (const p of MASTER_DATA_CS_GRANT) {
        expect(p).not.toContain(':delete');
        expect(p).not.toContain('master_data:other:');
      }
      expect(MASTER_DATA_CS_GRANT).toContain('master_data:customers:read');
      expect(MASTER_DATA_CS_GRANT).toContain('master_data:customers:write');
      expect(MASTER_DATA_CS_GRANT).not.toContain('master_data:customers:delete');
      expect(MASTER_DATA_CS_GRANT).not.toContain('master_data:other:read');
    });

    test('Full grant includes read, write, and delete for all 7 categories', () => {
      expect(MASTER_DATA_FULL_GRANT).toHaveLength(21); // 7 * 3
      for (const cat of MASTER_DATA_CATEGORIES) {
        expect(MASTER_DATA_FULL_GRANT).toContain(`master_data:${cat}:read`);
        expect(MASTER_DATA_FULL_GRANT).toContain(`master_data:${cat}:write`);
        expect(MASTER_DATA_FULL_GRANT).toContain(`master_data:${cat}:delete`);
      }
    });
  });

  describe('Role-Permission Resolution', () => {
    test('Superadmin roles receive MASTER_DATA_FULL_GRANT', () => {
      const superadminRoles = [ROLE_OWNER, 'TENANT_OWNER', ROLE_TENANT_SUPERADMIN, ROLE_TENANT_ADMIN];
      for (const role of superadminRoles) {
        const perms = resolvePermissionsForRole(role);
        for (const fullPerm of MASTER_DATA_FULL_GRANT) {
          expect(perms).toContain(fullPerm);
        }
      }
    });

    test('Customer Service (hq_cs) receives exact MASTER_DATA_CS_GRANT and no delete or other permissions', () => {
      const csPerms = resolvePermissionsForRole(ROLE_HQ_CS);
      for (const csPerm of MASTER_DATA_CS_GRANT) {
        expect(csPerms).toContain(csPerm);
      }
      for (const cat of MASTER_DATA_CATEGORIES) {
        expect(csPerms).not.toContain(`master_data:${cat}:delete`);
      }
      expect(csPerms).not.toContain('master_data:other:read');
      expect(csPerms).not.toContain('master_data:other:write');
    });

    test('Other operational roles do not have master data matrix grants', () => {
      const dispatcherPerms = resolvePermissionsForRole('hq_dispatcher');
      expect(dispatcherPerms).not.toContain('master_data:customers:write');
      expect(dispatcherPerms).not.toContain('master_data:other:delete');
    });
  });

  describe('Master Data Access Guard (canAccessMasterData)', () => {
    test('Superadmin can access all categories for read, write, and delete', () => {
      for (const cat of MASTER_DATA_CATEGORIES) {
        expect(canAccessMasterData(ROLE_TENANT_SUPERADMIN, cat, 'read')).toBe(true);
        expect(canAccessMasterData(ROLE_TENANT_SUPERADMIN, cat, 'write')).toBe(true);
        expect(canAccessMasterData(ROLE_TENANT_SUPERADMIN, cat, 'delete')).toBe(true);
      }
    });

    test('Customer Service (hq_cs) can read and write only the 6 allowed categories', () => {
      for (const cat of CS_MASTER_DATA_CATEGORIES) {
        expect(canAccessMasterData(ROLE_HQ_CS, cat, 'read')).toBe(true);
        expect(canAccessMasterData(ROLE_HQ_CS, cat, 'write')).toBe(true);
        expect(canAccessMasterData(ROLE_HQ_CS, cat, 'delete')).toBe(false); // No delete!
      }
      // "other" category is strictly denied for CS
      expect(canAccessMasterData(ROLE_HQ_CS, 'other', 'read')).toBe(false);
      expect(canAccessMasterData(ROLE_HQ_CS, 'other', 'write')).toBe(false);
      expect(canAccessMasterData(ROLE_HQ_CS, 'other', 'delete')).toBe(false);
    });

    test('assertMasterDataAccess throws 403 when access is denied', () => {
      expect(() => {
        assertMasterDataAccess({ role: ROLE_HQ_CS }, ['other'], 'read');
      }).toThrow();

      expect(() => {
        assertMasterDataAccess({ role: ROLE_HQ_CS }, ['customers'], 'delete');
      }).toThrow();

      // Allowed does not throw
      expect(() => {
        assertMasterDataAccess({ role: ROLE_HQ_CS }, ['customers'], 'read');
      }).not.toThrow();
      expect(() => {
        assertMasterDataAccess({ role: ROLE_TENANT_SUPERADMIN }, ['other'], 'delete');
      }).not.toThrow();
    });
  });

  describe('Admin Settings Visibility Guard', () => {
    test('Superadmin can see Admin Settings, Customer Service cannot', () => {
      expect(canSeeAdminSettings(ROLE_OWNER)).toBe(true);
      expect(canSeeAdminSettings(ROLE_TENANT_SUPERADMIN)).toBe(true);
      expect(canSeeAdminSettings(ROLE_TENANT_ADMIN)).toBe(true);

      // CS and other roles cannot
      expect(canSeeAdminSettings(ROLE_HQ_CS)).toBe(false);
      expect(canSeeAdminSettings('hq_finance')).toBe(false);
      expect(canSeeAdminSettings('sbu_tr_driver')).toBe(false);
      expect(canSeeAdminSettings(null)).toBe(false);
      expect(canSeeAdminSettings(undefined)).toBe(false);
    });
  });

  describe('Route to Category Mapping', () => {
    test('accurately maps master data routes to categories', () => {
      expect(masterDataCategoriesForPath('/tenant/master/contacts')).toEqual(['customers', 'vendors']);
      expect(masterDataCategoriesForPath('/tenant/master/transporters')).toEqual(['vendors']);
      expect(masterDataCategoriesForPath('/hq/master/drivers')).toEqual(['drivers']);
      expect(masterDataCategoriesForPath('/hq/master/fleets')).toEqual(['fleet']);
      expect(masterDataCategoriesForPath('/hq/master/locations')).toEqual(['locations']);
      expect(masterDataCategoriesForPath('/hq/finance/tax-management')).toEqual(['taxes']);
      expect(masterDataCategoriesForPath('/hq/master/services')).toEqual(['other']);
      expect(masterDataCategoriesForPath('/commercial/orders')).toBeNull();
    });
  });

  describe('Sidebar Navigation Resolution & Filtering', () => {
    const allSections: NavigationSection[] = [
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

    test('Customer Service (hq_cs) visible sections includes administration', () => {
      const csVisible = getVisibleNavigationSections(ROLE_HQ_CS);
      expect(csVisible).toContain('administration');
    });

    test('Superadmin sidebar shows Settings (Users, Settings) and all 7 Master Data items', () => {
      const resolved = resolveSections(allSections, ROLE_TENANT_SUPERADMIN);
      const adminSection = resolved.find((s) => s.id === 'administration');
      expect(adminSection).toBeDefined();

      const settingsGroup = adminSection?.groups.find((g) => g.label === 'Settings');
      expect(settingsGroup).toBeDefined();
      expect(settingsGroup?.items.map((i) => i.label)).toEqual(['Users', 'Settings']);

      const masterGroup = adminSection?.groups.find((g) => g.label === 'Master Data');
      expect(masterGroup).toBeDefined();
      const masterLabels = masterGroup?.items.map((i) => i.label);
      expect(masterLabels).toContain('Customers');
      expect(masterLabels).toContain('Vendors');
      expect(masterLabels).toContain('Drivers');
      expect(masterLabels).toContain('Fleets');
      expect(masterLabels).toContain('Locations');
      expect(masterLabels).toContain('Taxes');
      expect(masterLabels).toContain('Services');
    });

    test('Customer Service sidebar hides Settings group and shows ONLY the 6 allowed Master Data submenus', () => {
      const resolved = resolveSections(allSections, ROLE_HQ_CS);
      const adminSection = resolved.find((s) => s.id === 'administration');
      expect(adminSection).toBeDefined();

      // Settings group (Users, Settings) MUST be hidden
      const settingsGroup = adminSection?.groups.find((g) => g.label === 'Settings');
      expect(settingsGroup).toBeUndefined();

      // Master Data group must contain ONLY the 6 CS allowed items, excluding Services
      const masterGroup = adminSection?.groups.find((g) => g.label === 'Master Data');
      expect(masterGroup).toBeDefined();
      const masterLabels = masterGroup?.items.map((i) => i.label);

      expect(masterLabels).toEqual(['Customers', 'Vendors', 'Drivers', 'Fleets', 'Locations', 'Taxes']);
      expect(masterLabels).not.toContain('Services');
      expect(masterLabels).not.toContain('Users');
      expect(masterLabels).not.toContain('Settings');
    });

    test('Execution section includes Job Orders alongside Work Orders and Assignments', () => {
      const resolved = resolveSections(allSections, ROLE_TENANT_SUPERADMIN);
      const execSection = resolved.find((s) => s.id === 'execution');
      const truckingGroup = execSection?.groups.find((g) => g.label === 'Trucking');
      expect(truckingGroup).toBeDefined();

      const hrefs = truckingGroup?.items.map((i) => i.href);
      expect(hrefs).toContain('/sbu/trucking/work-orders');
      expect(hrefs).toContain('/hq/job-orders');
      expect(hrefs).toContain('/sbu/trucking/assignments');
    });
    test('Customer Service is strictly denied delete actions and non-CS categories on server guard', () => {
      // 1. Delete is rejected for all 6 CS categories
      for (const cat of CS_MASTER_DATA_CATEGORIES) {
        expect(() => assertMasterDataAccess({ role: ROLE_HQ_CS }, [cat], 'delete')).toThrow();
      }

      // 2. Other categories (Services, Fleet Types, etc.) are rejected for CS read and write
      expect(() => assertMasterDataAccess({ role: ROLE_HQ_CS }, ['other'], 'read')).toThrow();
      expect(() => assertMasterDataAccess({ role: ROLE_HQ_CS }, ['other'], 'write')).toThrow();

      // 3. Admin settings is strictly denied for CS
      expect(canSeeAdminSettings(ROLE_HQ_CS)).toBe(false);
    });

    test('Sidebar source contains single administration heading logic and tenant logo display', () => {
      const src = fs.readFileSync('components/layout/Sidebar.tsx', 'utf8');
      expect(src).toContain('isRedundantCategoryHeading');
      expect(src).toContain('profile?.tenants?.name');
      expect(src).toContain('profile.tenants.logo_url');
    });

    test('TopBar source contains tenant branding and delegates logout to ProfileDropdown', () => {
      const src = fs.readFileSync('components/layout/TopBar.tsx', 'utf8');
      expect(src).toContain('profile?.tenants?.name');
      expect(src).toContain('profile.tenants.logo_url');
      expect(src).toContain('<ProfileDropdown onSignOut={logout} />');
    });
  });
});
