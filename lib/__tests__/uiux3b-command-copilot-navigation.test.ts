import fs from 'fs';
import path from 'path';
import { describe, test, expect } from 'vitest';

const ROOT = process.cwd();

function readFile(relPath: string): string {
  const abs = path.isAbsolute(relPath) ? relPath : path.join(ROOT, relPath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
}

describe('Phase UI/UX-3B Command Center, Copilot & Navigation', () => {
  describe('Command Center', () => {
    test('CommandCenter.tsx exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'components/layout/CommandCenter.tsx'))).toBe(true);
    });

    test('supports keyboard shortcut (Cmd+K)', () => {
      const src = readFile('components/layout/CommandCenter.tsx');
      expect(src).toContain('metaKey');
      expect(src).toContain("key === 'k'");
    });

    test('supports search filtering', () => {
      const src = readFile('components/layout/CommandCenter.tsx');
      expect(src).toContain('filteredItems');
      expect(src).toContain('query');
    });

    test('includes commercial navigation items', () => {
      const src = readFile('components/layout/CommandCenter.tsx');
      expect(src).toContain('Engagements');
      expect(src).toContain('Quotes');
      expect(src).toContain('Sales Orders');
    });

    test('includes operations navigation items', () => {
      const src = readFile('components/layout/CommandCenter.tsx');
      expect(src).toContain('Forwarding');
      expect(src).toContain('Trucking');
      expect(src).toContain('Customs');
      expect(src).toContain('Warehouse');
    });
  });

  describe('App Launcher', () => {
    test('AppLauncher.tsx exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'components/layout/AppLauncher.tsx'))).toBe(true);
    });

    test('includes all workspace apps', () => {
      const src = readFile('components/layout/AppLauncher.tsx');
      expect(src).toContain('Commercial');
      expect(src).toContain('Operations');
      expect(src).toContain('Finance');
      expect(src).toContain('Intelligence');
    });

    test('apps have href for navigation', () => {
      const src = readFile('components/layout/AppLauncher.tsx');
      expect(src).toContain('href');
    });
  });

  describe('My Work', () => {
    test('MyWork.tsx exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'components/layout/MyWork.tsx'))).toBe(true);
    });

    test('shows today items', () => {
      const src = readFile('components/layout/MyWork.tsx');
      expect(src).toContain('Today');
    });

    test('shows attention items', () => {
      const src = readFile('components/layout/MyWork.tsx');
      expect(src).toContain('Needs Attention');
    });

    test('supports urgency indicators', () => {
      const src = readFile('components/layout/MyWork.tsx');
      expect(src).toContain('urgency');
    });
  });

  describe('Copilot Integration', () => {
    test('CopilotPanel.tsx exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'components/layout/CopilotPanel.tsx'))).toBe(true);
    });

    test('integrates with existing /api/copilot', () => {
      const src = readFile('components/layout/CopilotPanel.tsx');
      expect(src).toContain('/api/copilot');
    });

    test('does NOT create new Copilot engine', () => {
      const src = readFile('components/layout/CopilotPanel.tsx');
      expect(src).not.toContain('CopilotEngine');
      expect(src).not.toContain('new Copilot');
    });

    test('supports conversation history', () => {
      const src = readFile('components/layout/CopilotPanel.tsx');
      expect(src).toContain('messages');
      expect(src).toContain('role');
    });

    test('shows loading state', () => {
      const src = readFile('components/layout/CopilotPanel.tsx');
      expect(src).toContain('loading');
    });
  });

  describe('Existing Copilot Reuse', () => {
    test('existing CopilotEngine is preserved', () => {
      expect(fs.existsSync(path.join(ROOT, 'src/platforms/copilot/engine/CopilotEngine.ts'))).toBe(true);
    });

    test('existing Copilot API route is preserved', () => {
      expect(fs.existsSync(path.join(ROOT, 'app/api/copilot/route.ts'))).toBe(true);
    });

    test('existing context classes are preserved', () => {
      expect(fs.existsSync(path.join(ROOT, 'src/platforms/copilot/context/OperationalContext.ts'))).toBe(true);
    });
  });
});
