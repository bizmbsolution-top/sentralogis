import fs from 'fs';
import path from 'path';
import { describe, test, expect } from 'vitest';

const ROOT = process.cwd();

function readFile(relPath: string): string {
  const abs = path.isAbsolute(relPath) ? relPath : path.join(ROOT, relPath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
}

describe('Phase UI/UX-3A Application Shell', () => {
  describe('AppShell Component', () => {
    test('AppShell.tsx exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'components/layout/AppShell.tsx'))).toBe(true);
    });

    test('exports WORKSPACES constant', () => {
      const src = readFile('components/layout/AppShell.tsx');
      expect(src).toContain('export const WORKSPACES');
    });

    test('exports Workspace type', () => {
      const src = readFile('components/layout/AppShell.tsx');
      expect(src).toContain('export type Workspace');
    });

    test('exports useWorkspace hook', () => {
      const src = readFile('components/layout/AppShell.tsx');
      expect(src).toContain('export function useWorkspace');
    });

    test('defines 5 workspaces', () => {
      const src = readFile('components/layout/AppShell.tsx');
      expect(src).toContain("id: 'commercial'");
      expect(src).toContain("id: 'operations'");
      expect(src).toContain("id: 'finance'");
      expect(src).toContain("id: 'intelligence'");
      expect(src).toContain("id: 'admin'");
    });

    test('workspace switching is supported', () => {
      const src = readFile('components/layout/AppShell.tsx');
      expect(src).toContain('setActiveWorkspace');
    });
  });

  describe('Sidebar Component', () => {
    test('Sidebar.tsx exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'components/layout/Sidebar.tsx'))).toBe(true);
    });

    test('sidebar is workspace-aware', () => {
      const src = readFile('components/layout/Sidebar.tsx');
      expect(src).toContain('WORKSPACE_NAV');
      expect(src).toContain('activeWorkspace');
    });

    test('sidebar supports responsive behavior', () => {
      const src = readFile('components/layout/Sidebar.tsx');
      expect(src).toContain('isOpen');
      expect(src).toContain('onClose');
    });

    test('commercial navigation exists', () => {
      const src = readFile('components/layout/Sidebar.tsx');
      expect(src).toContain("'Engagements'");
      expect(src).toContain("'Quotes'");
      expect(src).toContain("'Sales Orders'");
    });

    test('operations navigation exists', () => {
      const src = readFile('components/layout/Sidebar.tsx');
      expect(src).toContain("'Forwarding'");
      expect(src).toContain("'Trucking'");
      expect(src).toContain("'Customs'");
      expect(src).toContain("'Warehouse'");
    });

    test('finance navigation exists', () => {
      const src = readFile('components/layout/Sidebar.tsx');
      expect(src).toContain("'Invoices'");
      expect(src).toContain("'Payments'");
      expect(src).toContain("'Settlements'");
    });
  });

  describe('TopBar Component', () => {
    test('TopBar.tsx exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'components/layout/TopBar.tsx'))).toBe(true);
    });

    test('topbar has workspace switcher', () => {
      const src = readFile('components/layout/TopBar.tsx');
      expect(src).toContain('activeWorkspace');
      expect(src).toContain('setActiveWorkspace');
    });

    test('topbar has search', () => {
      const src = readFile('components/layout/TopBar.tsx');
      expect(src).toContain('Search');
    });

    test('topbar has notifications', () => {
      const src = readFile('components/layout/TopBar.tsx');
      expect(src).toContain('Bell');
    });

    test('topbar has user menu', () => {
      const src = readFile('components/layout/TopBar.tsx');
      expect(src).toContain('User');
    });
  });

  describe('Dashboard Layout', () => {
    test('dashboard layout uses AppShell', () => {
      const src = readFile('app/(dashboard)/layout.tsx');
      expect(src).toContain('AppShell');
    });

    test('legacy Sidebar import removed', () => {
      const src = readFile('app/(dashboard)/layout.tsx');
      expect(src).not.toContain("from '@/components/layout/Sidebar'");
    });
  });
});
