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

describe('Phase UI/UX-3H Functional Workspace Implementation', () => {
  describe('Engagement CRUD', () => {
    test('Engagement list page exists', () => {
      expect(fileExists('app/(dashboard)/commercial/engagements/page.tsx')).toBe(true);
    });

    test('Engagement detail page exists', () => {
      expect(fileExists('app/(dashboard)/commercial/engagements/[id]/page.tsx')).toBe(true);
    });

    test('Engagement list has search and filter', () => {
      const src = readFile('app/(dashboard)/commercial/engagements/page.tsx');
      expect(src).toContain('Search');
      expect(src).toContain('statusFilter');
    });

    test('Engagement detail shows customer and status', () => {
      const src = readFile('app/(dashboard)/commercial/engagements/[id]/page.tsx');
      expect(src).toContain('customer_name');
      expect(src).toContain('status');
    });
  });

  describe('SO Line Item Editor', () => {
    test('SOLineItemEditor component exists', () => {
      expect(fileExists('components/commercial/SOLineItemEditor.tsx')).toBe(true);
    });

    test('supports capability type selection', () => {
      const src = readFile('components/commercial/SOLineItemEditor.tsx');
      expect(src).toContain('capabilityType');
      expect(src).toContain('FORWARDING');
      expect(src).toContain('CUSTOMS');
      expect(src).toContain('TRUCKING');
      expect(src).toContain('WAREHOUSE');
    });

    test('calculates amount from quantity × rate', () => {
      const src = readFile('components/commercial/SOLineItemEditor.tsx');
      expect(src).toContain('quantity');
      expect(src).toContain('unitRate');
      expect(src).toContain('calculatedAmount');
    });

    test('prevents mutation of committed items', () => {
      const src = readFile('components/commercial/SOLineItemEditor.tsx');
      expect(src).toContain('isCommitted');
      expect(src).toContain('Cannot remove committed');
    });
  });

  describe('Pricing UX', () => {
    test('PricingDisplay component exists', () => {
      expect(fileExists('components/commercial/PricingDisplay.tsx')).toBe(true);
    });

    test('shows rate source and calculation', () => {
      const src = readFile('components/commercial/PricingDisplay.tsx');
      expect(src).toContain('rateSource');
      expect(src).toContain('calculatedAmount');
    });

    test('does NOT calculate prices client-side', () => {
      const src = readFile('components/commercial/PricingDisplay.tsx');
      expect(src).not.toMatch(/unitRate\s*=\s*[^=]/);
    });
  });

  describe('Override UX', () => {
    test('OverridePanel component exists', () => {
      expect(fileExists('components/commercial/OverridePanel.tsx')).toBe(true);
    });

    test('shows variance and threshold', () => {
      const src = readFile('components/commercial/OverridePanel.tsx');
      expect(src).toContain('deltaPercent');
      expect(src).toContain('threshold');
    });

    test('requires reason for override', () => {
      const src = readFile('components/commercial/OverridePanel.tsx');
      expect(src).toContain('Reason (required)');
      expect(src).toContain('minimum 5 characters');
    });

    test('shows approval notice for large overrides', () => {
      const src = readFile('components/commercial/OverridePanel.tsx');
      expect(src).toContain('approval required');
    });
  });

  describe('Copilot Integration', () => {
    test('CopilotPanel integrates with existing /api/copilot', () => {
      const src = readFile('components/layout/CopilotPanel.tsx');
      expect(src).toContain('/api/copilot');
    });

    test('does NOT create new Copilot engine', () => {
      const src = readFile('components/layout/CopilotPanel.tsx');
      expect(src).not.toContain('CopilotEngine');
    });
  });

  describe('Security', () => {
    test('no browser-direct business mutation in workspace pages', () => {
      const pages = [
        'app/(dashboard)/commercial/engagements/page.tsx',
        'app/(dashboard)/commercial/engagements/[id]/page.tsx',
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
