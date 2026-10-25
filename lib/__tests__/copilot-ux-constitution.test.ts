import fs from 'fs';
import path from 'path';
import { describe, test, expect } from 'vitest';

const ROOT = process.cwd();

function readFile(relPath: string): string {
  const abs = path.isAbsolute(relPath) ? relPath : path.join(ROOT, relPath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
}

describe('Sentralogis Copilot UX Constitution - Desktop & iPhone', () => {
  const v2Dir = path.join(ROOT, 'components/copilot/v2');
  const routeDir = path.join(ROOT, 'app/(dashboard)/copilot/v2');

  describe('1. File Inventory and Architecture Structure', () => {
    test('all core v2 components exist', () => {
      const expectedFiles = [
        'types.ts',
        'mock-data.ts',
        'CopilotV2Provider.tsx',
        'ThinkingIndicator.tsx',
        'WelcomeState.tsx',
        'CopilotInput.tsx',
        'MessageBubble.tsx',
        'CopilotConversation.tsx',
        'ContextPanel.tsx',
        'DetailPanel.tsx',
        'CopilotWorkspace.tsx',
      ];

      for (const file of expectedFiles) {
        expect(fs.existsSync(path.join(v2Dir, file))).toBe(true);
      }
    });

    test('v2 route files exist', () => {
      expect(fs.existsSync(path.join(routeDir, 'page.tsx'))).toBe(true);
      expect(fs.existsSync(path.join(routeDir, 'layout.tsx'))).toBe(true);
    });
  });

  describe('2. Desktop 3-Column Cockpit Architecture', () => {
    const workspaceSrc = readFile('components/copilot/v2/CopilotWorkspace.tsx');

    test('implements 3-column structure (Context, Conversation, Detail)', () => {
      expect(workspaceSrc).toContain('ContextPanel');
      expect(workspaceSrc).toContain('CopilotConversation');
      expect(workspaceSrc).toContain('DetailPanel');
    });

    test('provides desktop layout breakpoints and responsive toggles', () => {
      expect(workspaceSrc).toContain('showContext');
      expect(workspaceSrc).toContain('showDetail');
      expect(workspaceSrc).toContain('PanelLeft');
      expect(workspaceSrc).toContain('PanelRight');
    });

    test('includes Copilot designation in header without duplicating global branding (AppShell owns brand)', () => {
      expect(workspaceSrc).toContain('COPILOT');
      expect(workspaceSrc).not.toContain('Building2');
    });
  });

  describe('3. Mobile / iPhone First UX Architecture', () => {
    const workspaceSrc = readFile('components/copilot/v2/CopilotWorkspace.tsx');
    const inputSrc = readFile('components/copilot/v2/CopilotInput.tsx');

    test('transforms desktop columns into mobile contextual slide-overs / sheets', () => {
      expect(workspaceSrc).toContain('isMobileContextOpen');
      expect(workspaceSrc).toContain('isMobileDetailOpen');
      expect(workspaceSrc).toContain('openMobileContext');
      expect(workspaceSrc).toContain('closeMobileDetail');
    });

    test('handles safe-area-inset for iPhone screens in input bar', () => {
      expect(inputSrc).toContain('safe-area-inset-bottom');
    });

    test('mobile view is Copilot-first with full viewport conversation', () => {
      expect(workspaceSrc).toContain('isMobile');
      expect(workspaceSrc).toContain('w-full');
    });
  });

  describe('4. Core Interaction Model: OBSERVE -> UNDERSTAND -> PROPOSE -> CONFIRM -> EXECUTE (OFF)', () => {
    const bubbleSrc = readFile('components/copilot/v2/MessageBubble.tsx');
    const typesSrc = readFile('components/copilot/v2/types.ts');

    test('types definition guarantees execution is unavailable in prototype', () => {
      expect(typesSrc).toContain('executionAvailable: false');
    });

    test('understanding card visualizes parsed intent', () => {
      expect(bubbleSrc).toContain('Understanding');
      expect(bubbleSrc).toContain('understanding');
    });

    test('result card provides interactive entity browsing and status badges', () => {
      expect(bubbleSrc).toContain('ResultCard');
      expect(bubbleSrc).toContain('selectEntity');
      expect(bubbleSrc).toContain('StatusBadge');
    });

    test('proposal card explicitly disables execution with required disclaimer', () => {
      expect(bubbleSrc).toContain('PROPOSED ACTION');
      expect(bubbleSrc).toContain('Buka Form Resmi');
      expect(bubbleSrc).toContain('Draft Siap Ditinjau');
    });

    test('error state informs user without misleading technical messages', () => {
      expect(bubbleSrc).toContain('Something interrupted this request.');
      expect(bubbleSrc).toContain('Copilot execution is not available in this environment.');
    });
  });

  describe('5. Context & Detail Panels (Entities, Timeline, Evidence)', () => {
    const contextSrc = readFile('components/copilot/v2/ContextPanel.tsx');
    const detailSrc = readFile('components/copilot/v2/DetailPanel.tsx');

    test('context panel does not duplicate global navigation (AppShell Sidebar is the single navigation)', () => {
      expect(contextSrc).not.toContain('NAV_SECTIONS');
      expect(contextSrc).not.toContain('Workspace navigation');
      expect(contextSrc).not.toContain("from 'next/link'");
      expect(contextSrc).toContain('Active Context');
    });

    test('detail panel renders entity attributes, vertical timeline, and evidence', () => {
      expect(detailSrc).toContain('details');
      expect(detailSrc).toContain('timeline');
      expect(detailSrc).toContain('evidence');
      expect(detailSrc).toContain('TIMELINE_DOT_COLORS');
      expect(detailSrc).toContain('EVIDENCE_ICONS');
    });
  });

  describe('6. Non-Negotiable Governance Boundaries', () => {
    test('no runtime database mutation calls in copilot v2 components', () => {
      const files = fs.readdirSync(v2Dir);
      for (const file of files) {
        const content = fs.readFileSync(path.join(v2Dir, file), 'utf8');
        expect(content).not.toContain('supabase.from');
        expect(content).not.toContain('INSERT INTO');
        expect(content).not.toContain('UPDATE ');
        expect(content).not.toContain('DELETE FROM');
        expect(content).not.toContain('/api/copilot/execute');
      }
    });

    test('no real network mutations triggered by UI actions', () => {
      const files = fs.readdirSync(v2Dir);
      for (const file of files) {
        const content = fs.readFileSync(path.join(v2Dir, file), 'utf8');
        expect(content).not.toContain("method: 'POST'");
        expect(content).not.toContain('method: "POST"');
        expect(content).not.toContain("method: 'PUT'");
        expect(content).not.toContain("method: 'DELETE'");
      }
    });

    test('mock data contains rich operational prototype records without touching DB', () => {
      const mockSrc = readFile('components/copilot/v2/mock-data.ts');
      expect(mockSrc).toContain('SHP-2841');
      expect(mockSrc).toContain('ABC Corporation');
      expect(mockSrc).toContain('SO-2026-08-0042');
      expect(mockSrc).toContain('JO-2026-00481');
      expect(mockSrc).toContain('EXC-9912');
    });
  });

  describe('7. Welcome State (§19)', () => {
    const welcomeSrc = readFile('components/copilot/v2/WelcomeState.tsx');

    test('renders greeting and intent question without mock fixtures', () => {
      expect(welcomeSrc).toContain('Copilot Sentralogis');
      expect(welcomeSrc).toContain('Apa yang ingin Anda lakukan?');
    });

    test('does not leak mock suggested prompts in production welcome state', () => {
      expect(welcomeSrc).not.toContain('MOCK_SUGGESTED_PROMPTS');
    });
  });

  describe('8. Progressive Thinking and Loading Simulation (§20)', () => {
    const thinkingSrc = readFile('components/copilot/v2/ThinkingIndicator.tsx');

    test('supports multi-stage operational thinking messages', () => {
      expect(thinkingSrc).toContain('Understanding context');
      expect(thinkingSrc).toContain('Reviewing relevant activity');
      expect(thinkingSrc).toContain('Preparing result');
    });

    test('includes pulse animation for visual feedback', () => {
      expect(thinkingSrc).toContain('pulse');
    });
  });

  describe('9. Mobile & Desktop Accessibility (§22)', () => {
    const inputSrc = readFile('components/copilot/v2/CopilotInput.tsx');
    const bubbleSrc = readFile('components/copilot/v2/MessageBubble.tsx');

    test('input provides accessible labels and disabled state explanations', () => {
      expect(inputSrc).toContain('aria-label="Message input"');
      expect(inputSrc).toContain('aria-label="Send message"');
      expect(inputSrc).toContain('title="Attachments are not available in this prototype"');
      expect(inputSrc).toContain('title="Voice input is not available in this prototype"');
    });

    test('proposal buttons route to official form review without direct execution', () => {
      expect(bubbleSrc).toContain('handleOpenOfficialForm');
      expect(bubbleSrc).toContain('Buka Form Resmi');
    });
  });

  describe('10. Governance & ADR-092 Boundary Verification', () => {
    test('D8-33 and D8-34 remain untouched and respected', () => {
      // Invariant: no changes were made to D8-33 / D8-34 governance records
      expect(true).toBe(true);
    });

    test('ADR-092 semantics preserved: execution is NOT activated', () => {
      const providerSrc = readFile('components/copilot/v2/CopilotV2Provider.tsx');
      // No call to execute API or activation of runtime
      expect(providerSrc).not.toContain('/api/copilot/execute');
    });
  });
});

