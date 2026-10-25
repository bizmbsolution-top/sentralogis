/**
 * Sentralogis — Copilot V2 Mobile Responsive & Occlusion Remediation Test Suite
 * lib/__tests__/copilot-v2-mobile-responsive.test.ts
 *
 * Verifies Decision A-Refined + Decision C:
 * 1. MobileBottomNav suppresses itself on /copilot/v2 route.
 * 2. MobileBottomNav preserves standard behavior on all other routes.
 * 3. CopilotWorkspace uses dynamic viewport sizing (h-dvh).
 * 4. CopilotInput preserves safe-area insets without occlusion.
 * 5. Breakpoint and desktop invariants remain intact.
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('SENTRALOGIS COPILOT V2 — MOBILE COMPOSER OCCLUSION REMEDIATION', () => {
  const ROOT = process.cwd();

  test('MobileBottomNav.tsx contains route-aware suppression for /copilot/v2', () => {
    const filePath = path.join(ROOT, 'components/layout/MobileBottomNav.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('usePathname');
    expect(content).toContain("pathname?.startsWith('/copilot/v2')");
    expect(content).toContain('return null;');
  });

  test('MobileBottomNav.tsx preserves standard responsive layout for other routes', () => {
    const filePath = path.join(ROOT, 'components/layout/MobileBottomNav.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Preserves lg:hidden desktop hiding
    expect(content).toContain('lg:hidden');
    // Preserves max 5 priority items
    expect(content).toContain('.slice(0, 5)');
    // Preserves touch targets
    expect(content).toContain('h-12');
  });

  test('CopilotWorkspace.tsx fills its container (h-full; dvh sizing is on the page wrapper)', () => {
    const filePath = path.join(ROOT, 'components/copilot/v2/CopilotWorkspace.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('h-full');
    expect(content).not.toContain('h-screen');
  });

  test('CopilotInput.tsx preserves safe-area bottom padding', () => {
    const filePath = path.join(ROOT, 'components/copilot/v2/CopilotInput.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('env(safe-area-inset-bottom');
  });

  test('CopilotConversation.tsx renders CopilotInput as static bottom element', () => {
    const filePath = path.join(ROOT, 'components/copilot/v2/CopilotConversation.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('<CopilotInput />');
    expect(content).toContain('flex-1 overflow-y-auto');
  });

  test('CopilotV2 page is embedded in AppShell and sized with dynamic viewport units', () => {
    const filePath = path.join(ROOT, 'app/(dashboard)/copilot/v2/page.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Must NOT be a full-screen overlay that hides the AppShell Sidebar/TopBar
    expect(content).not.toContain('fixed inset-0');
    expect(content).toContain('100dvh');
    expect(content).toContain('<CopilotWorkspace />');
  });
});
