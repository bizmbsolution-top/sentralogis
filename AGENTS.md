## Goal
Add Indonesia-English-China language selector with flag icons to `/track/wo/[token]` page and ensure text translates properly.

## Constraints & Preferences
- (none)

## Progress
### Done
- Fixed syntax errors in `lib/i18n/translations.ts` (duplicate `wo` blocks, missing `pending` in filterTab)
- Added `wo` translations to all locales (id, en, zh)
- Updated `/app/track/wo/[token]/page.tsx` to use `t()` for status labels, filter tabs, work order, live, customer
- Fixed `MultiFleetRadarMap` import in WO page
- Fixed bug in `LanguageSelector.tsx` (locale comparison logic)
- Deployed to Vercel production (https://sentralogis.com)

### In Progress
- (none)

### Blocked
- (none)

## Key Decisions
- Used existing `useLanguage` hook pattern instead of creating new i18n solution
- Reused `LanguageSelector` component across pages for consistency
- Used emoji flags (🇮🇩, 🇺🇸, 🇨🇳) for language selector display

## Next Steps
- (future) Activate/complete internal movements, repacking, bundling, and kitting features (see `140626.md`)
- (future) Historical Route Playback (Trip Replay / Blackbox Audit ala YouTube): Convert 10-second GPS ping records into a polyline trajectory with a media player timeline scrubber (rewind/forward/play at 1x-10x speeds) and dynamic info badge above the truck icon.

## Critical Context
- `LanguageSelector` component uses emoji flags for Indonesia (🇮🇩), English (🇺🇸), and China (🇨🇳)
- WO page already uses `useLanguage` hook with `t` function for translations
- Some remaining hardcoded strings in WO page (Progress Pengiriman, Seluruh Pekerjaan Selesai, etc.) are context-specific and may not need translation

## Relevant Files
- `/lib/i18n/translations.ts`: Contains `wo` namespace translations for all 3 locales
- `/lib/i18n/LanguageContext.tsx`: Exports `useLanguage` hook for translation access
- `/components/LanguageSelector.tsx`: Reusable language selector with flag emojis
- `/app/track/wo/[token]/page.tsx`: WO tracking page with translated text
