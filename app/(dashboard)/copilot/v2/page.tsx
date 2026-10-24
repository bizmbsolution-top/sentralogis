'use client';

import { CopilotWorkspace } from '@/components/copilot/v2/CopilotWorkspace';

export default function CopilotV2Page() {
  return (
    // Embedded in AppShell main area (cancels main padding) so Sidebar/TopBar stay visible.
    <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6 h-[calc(100dvh-8rem-env(safe-area-inset-bottom,0px))] lg:h-[calc(100dvh-4rem)] overflow-hidden">
      <CopilotWorkspace />
    </div>
  );
}
