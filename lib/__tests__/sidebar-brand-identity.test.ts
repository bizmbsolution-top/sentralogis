import { describe, test, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const HALU_TENANT = {
  name: 'HALU',
  tenant_code: 'HALU-001',
  logo_url:
    'https://nsvkewvmzivudkcczhnk.supabase.co/storage/v1/object/public/logos/tenant_logos/78846049-fb63-45a9-93da-3af3fea5b587_1778946491766.png',
};

const PROFILE = {
  full_name: 'Brand Probe',
  email: 'brand-probe@example.test',
  role: 'tenant_admin',
  tenant_code: 'HALU-001',
  tenants: HALU_TENANT,
};

vi.mock('next/navigation', () => ({
  usePathname: () => '/hq/finance',
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: React.ReactNode;
    [key: string]: unknown;
  }) =>
    React.createElement(
      'a',
      { href: typeof href === 'string' ? href : String(href), ...rest },
      children
    ),
}));

vi.mock('../../components/layout/AppShell', () => ({
  useNavigation: () => ({
    visibleSections: ['command-center', 'work', 'administration'],
    setSidebarOpen: () => {},
    role: 'tenant_admin',
  }),
  NAVIGATION_SECTIONS: [],
}));

vi.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({ profile: PROFILE, user: { id: 'probe' }, isAuthenticated: true }),
}));

import Sidebar from '@/components/layout/Sidebar';
import { getDashboardRoute } from '@/lib/utils/dashboardRoute';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const readSource = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const render = (role?: string) => {
  if (role) {
    PROFILE.role = role;
  }
  return renderToStaticMarkup(
    React.createElement(Sidebar, { isOpen: true, onClose: () => {} })
  );
};

describe('Sidebar brand identity and brand click behaviour', () => {
  test('the brand renders the canonical Sentralogis logo asset', () => {
    const html = render();
    expect(html).toContain('src="/logosentralogis.png"');
    expect(html).toContain('alt="Sentralogis OS"');
  });

  test('the brand does not fall back to a deleted logo asset', () => {
    const html = render();
    expect(html).not.toContain('logo2sentralogis');
    expect(html).not.toContain('sentralogis_logo');
    expect(html).not.toContain('"/logo.png"');
    expect(html).not.toContain('"/logo.svg"');
  });

  test('the brand wordmark text is still rendered', () => {
    const html = render();
    expect(html).toContain('SENTRALOGIS');
    expect(html).toContain('Operating System');
  });

  test('the brand link targets the role-aware dashboard, never the public landing page', () => {
    const html = render('tenant_admin');
    expect(getDashboardRoute('tenant_admin')).toBe('/copilot/v2');
    expect(html).toContain('href="/copilot/v2"');
    expect(html).not.toContain('href="/"');
  });

  test('the brand link is role-aware for a dedicated portal role', () => {
    const html = render('warehouse_customer');
    expect(getDashboardRoute('warehouse_customer')).toBe('/customer/warehouse');
    expect(html).toContain('href="/customer/warehouse"');
  });

  test('the brand is not wired to any logout function', () => {
    const html = render();
    expect(html).not.toMatch(/logout/i);
    expect(html).not.toMatch(/signout/i);
    expect(html).not.toMatch(/LogOut/i);
  });

  test('the Sentralogis brand logo and the tenant logo are distinct elements', () => {
    const html = render();
    const brandLogo = html.match(/src="\/logosentralogis\.png"/);
    const tenantLogo = html.match(
      new RegExp(`src="${HALU_TENANT.logo_url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`)
    );
    expect(brandLogo).not.toBeNull();
    expect(tenantLogo).not.toBeNull();
    expect(brandLogo![0]).not.toBe(tenantLogo![0]);
  });

  test('the HALU tenant identity is preserved in the tenant badge', () => {
    const html = render();
    expect(html).toContain('HALU');
    expect(html).toContain('HALU-001');
  });
});

describe('Logout control containment', () => {
  test('the sidebar source contains no logout or sign-out call', () => {
    const source = readSource('components/layout/Sidebar.tsx');
    expect(source).not.toMatch(/signOut\s*\(/);
    expect(source).not.toMatch(/\blogout\b/i);
  });

  test('the logout control still lives in ProfileDropdown with a confirmation step', () => {
    const source = readSource('components/layout/ProfileDropdown.tsx');
    expect(source).toContain('LogOut');
    expect(source).toContain('Logout');
    expect(source).toContain('setConfirmSignOut(true)');
    expect(source).toContain('onSignOut');
  });

  test('the top bar still wires the auth logout into ProfileDropdown', () => {
    const source = readSource('components/layout/TopBar.tsx');
    expect(source).toContain('<ProfileDropdown onSignOut={logout} />');
  });
});
