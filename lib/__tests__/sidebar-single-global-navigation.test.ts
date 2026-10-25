import fs from 'fs';
import path from 'path';
import { describe, test, expect } from 'vitest';
import { getVisibleNavigationSections } from '../navigation/types';

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Single global sidebar (Sidebar redesign reconciliation)', () => {
  const sidebar = read('components/layout/Sidebar.tsx');
  const workspace = read('components/copilot/v2/CopilotWorkspace.tsx');
  const contextPanel = read('components/copilot/v2/ContextPanel.tsx');
  const topBar = read('components/layout/TopBar.tsx');
  const copilotPage = read('app/(dashboard)/copilot/v2/page.tsx');

  test('the global sidebar is rendered once, by AppShell only', () => {
    const appShell = read('components/layout/AppShell.tsx');
    expect((appShell.match(/<Sidebar\b/g) || []).length).toBe(1);
    expect(copilotPage).not.toContain('<Sidebar');
    expect(workspace).not.toContain('<Sidebar');
    expect(contextPanel).not.toContain('<Sidebar');
  });

  test('Copilot workspace does not render a second global navigation', () => {
    expect(contextPanel).not.toContain('NAV_SECTIONS');
    expect(contextPanel).not.toContain("from 'next/link'");
    expect(contextPanel).not.toContain('<nav');
    expect(workspace).not.toContain('Building2');
    expect(workspace).not.toContain('Search or ask anything');
  });

  test('mobile Copilot button controls Active Context, not global navigation', () => {
    expect(workspace).toContain('Open active context');
    expect(workspace).not.toContain('Open navigation');
    expect(topBar).toContain('Open navigation menu');
  });

  test('Administration > Master Data points at the real Master Contacts route', () => {
    expect(sidebar).toContain("'administration'");
    expect(sidebar).toContain("label: 'Master Data'");
    expect(sidebar).toContain('/tenant/master/contacts');
    expect(fs.existsSync(path.join(ROOT, 'app/(dashboard)/tenant/master/contacts/page.tsx'))).toBe(true);
  });

  test('Administration remains permission-gated by existing role policy', () => {
    expect(getVisibleNavigationSections('tenant_admin')).toContain('administration');
    expect(getVisibleNavigationSections('tenant_superadmin')).toContain('administration');
    expect(getVisibleNavigationSections('owner_sentralogis')).toContain('administration');
    expect(getVisibleNavigationSections('hq_cs')).toContain('administration');
    expect(getVisibleNavigationSections('hq_ops')).not.toContain('administration');
    expect(getVisibleNavigationSections('sbu_trucking')).not.toContain('administration');
    expect(getVisibleNavigationSections('driver')).not.toContain('administration');
  });

  test('sidebar de-duplicates identical destinations at render time without bypassing visibility', () => {
    expect(sidebar).toContain('function resolveSections');
    expect(sidebar).toContain('seen.has(item.href)');
    expect(sidebar).toContain('visible.includes(id)');
  });

  test('desktop collapse/expand and mobile drawer controls are present and distinct', () => {
    expect(sidebar).toContain('Collapse sidebar');
    expect(sidebar).toContain('Expand sidebar');
    expect(sidebar).toContain('Close sidebar');
    expect(topBar).toContain('lg:hidden');
  });
});
