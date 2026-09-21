import fs from 'fs';
import path from 'path';
import { describe, test, expect } from 'vitest';

const ROOT = process.cwd();

function readFile(relPath: string): string {
  const abs = path.isAbsolute(relPath) ? relPath : path.join(ROOT, relPath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
}

function fileExists(relPath: string): boolean {
  const abs = path.isAbsolute(relPath) ? relPath : path.join(ROOT, relPath);
  return fs.existsSync(abs);
}

describe('Phase UI/UX-3E Persona Workspace Implementation', () => {
  describe('Commercial Workspace', () => {
    test('Commercial dashboard page exists', () => {
      expect(fileExists('app/(dashboard)/commercial/page.tsx')).toBe(true);
    });

    test('Commercial dashboard shows stats', () => {
      const src = readFile('app/(dashboard)/commercial/page.tsx');
      expect(src).toContain('Active Orders');
      expect(src).toContain('Pending Quotes');
      expect(src).toContain('Revenue');
    });

    test('Commercial dashboard has attention items', () => {
      const src = readFile('app/(dashboard)/commercial/page.tsx');
      expect(src).toContain('Needs Attention');
    });

    test('Commercial dashboard has quick actions', () => {
      const src = readFile('app/(dashboard)/commercial/page.tsx');
      expect(src).toContain('Quick Actions');
      expect(src).toContain('New Quote');
      expect(src).toContain('New Order');
    });
  });

  describe('Operations Workspace', () => {
    test('Operations dashboard page exists and redirects to Control Tower', () => {
      expect(fileExists('app/(dashboard)/operations/page.tsx')).toBe(true);
      const src = readFile('app/(dashboard)/operations/page.tsx');
      expect(src).toContain('redirect');
      expect(src).toContain('/commercial/control-tower');
    });
  });

  describe('Finance Workspace', () => {
    test('Finance dashboard page exists', () => {
      expect(fileExists('app/(dashboard)/finance/page.tsx')).toBe(true);
    });

    test('Finance dashboard shows financial stats', () => {
      const src = readFile('app/(dashboard)/finance/page.tsx');
      expect(src).toContain('Total Revenue');
      expect(src).toContain('Outstanding AR');
      expect(src).toContain('AP Payable');
    });

    test('Finance dashboard shows exceptions', () => {
      const src = readFile('app/(dashboard)/finance/page.tsx');
      expect(src).toContain('Financial Exceptions');
    });
  });

  describe('Control Tower', () => {
    test('Control Tower page exists', () => {
      expect(fileExists('app/(dashboard)/intelligence/page.tsx')).toBe(true);
    });

    test('Control Tower shows domain health', () => {
      const src = readFile('app/(dashboard)/intelligence/page.tsx');
      expect(src).toContain('Forwarding');
      expect(src).toContain('Trucking');
      expect(src).toContain('Customs');
      expect(src).toContain('Warehouse');
    });

    test('Control Tower shows risks', () => {
      const src = readFile('app/(dashboard)/intelligence/page.tsx');
      expect(src).toContain('Active Risks');
    });
  });

  describe('Customer Portal', () => {
    test('Customer portal page exists', () => {
      expect(fileExists('app/(dashboard)/portal/customer/page.tsx')).toBe(true);
    });

    test('Customer portal shows orders', () => {
      const src = readFile('app/(dashboard)/portal/customer/page.tsx');
      expect(src).toContain('Orders');
      expect(src).toContain('Shipments');
    });

    test('Customer portal does NOT expose internal pricing', () => {
      const src = readFile('app/(dashboard)/portal/customer/page.tsx');
      expect(src).not.toContain('margin');
      expect(src).not.toContain('Margin');
      expect(src).not.toContain('cost');
    });
  });

  describe('Vendor Portal', () => {
    test('Vendor portal page exists', () => {
      expect(fileExists('app/(dashboard)/portal/partner/page.tsx')).toBe(true);
    });

    test('Vendor portal shows assignments', () => {
      const src = readFile('app/(dashboard)/portal/partner/page.tsx');
      expect(src).toContain('Assignments');
      expect(src).toContain('Jobs');
    });

    test('Vendor portal does NOT expose internal costs', () => {
      const src = readFile('app/(dashboard)/portal/partner/page.tsx');
      expect(src).not.toContain('margin');
      expect(src).not.toContain('Margin');
      expect(src).not.toContain('internal cost');
    });
  });

  describe('Copilot Integration', () => {
    test('CopilotPanel integrates with existing /api/copilot', () => {
      const src = readFile('components/layout/CopilotPanel.tsx');
      expect(src).toContain('/api/copilot');
    });

    test('CopilotPanel does NOT create new Copilot engine', () => {
      const src = readFile('components/layout/CopilotPanel.tsx');
      expect(src).not.toContain('CopilotEngine');
      expect(src).not.toContain('new Copilot');
    });

    test('Existing CopilotEngine is preserved', () => {
      expect(fileExists('src/platforms/copilot/engine/CopilotEngine.ts')).toBe(true);
    });
  });

  describe('Security', () => {
    test('no browser-direct business mutation in workspace pages', () => {
      const pages = [
        'app/(dashboard)/commercial/page.tsx',
        'app/(dashboard)/operations/page.tsx',
        'app/(dashboard)/finance/page.tsx',
        'app/(dashboard)/intelligence/page.tsx',
        'app/(dashboard)/portal/customer/page.tsx',
        'app/(dashboard)/portal/partner/page.tsx',
      ];
      for (const page of pages) {
        const src = readFile(page);
        expect(src).not.toContain('supabase.from');
        expect(src).not.toContain('.insert(');
        expect(src).not.toContain('.update(');
        expect(src).not.toContain('.delete(');
      }
    });
  });
});
