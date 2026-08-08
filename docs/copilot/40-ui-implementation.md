# 40. UI Implementation Rules

## Strict Adherence to Minimalism
- **Borders over Shadows**: Prefer 1px slate-200 borders over heavy drop shadows.
- **Monochrome Foundation**: Base UI is white and slate. Use colors (Indigo, Emerald, Rose, Amber) *strictly* for semantic meaning.
- **No Floating Windows**: The Cockpit is a fixed, flush layout. Do not use modals or popups within the Copilot view. If something needs editing, edit it inline.

## Responsive Behavior
- **Desktop First**: The Dual-Panel layout is designed for Desktop (1024px+).
- **Tablet/Mobile**: On smaller screens, the `OperationalContextPanel` should either hide behind a toggle or stack below the workspace (though mobile usage by operators is rare).

## State Architecture
React components in `components/copilot/` MUST remain stateless presentation components wherever possible.
All orchestration state (Messages, ActiveContext, PinnedJobs) should live in the parent `page.tsx` or a dedicated Context Provider, keeping the UI layer pure.
