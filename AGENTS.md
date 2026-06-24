## Goal
Implement token burning per SBU (trucking 2, warehouse 1, clearance 2, forwarding 1 token/JO) with low-balance notifications and deploy to Vercel production.

## Constraints & Preferences
- Two notification levels: bottom stock (≤5 tokens) alert and balance=0 alert
- Notifications via in-app `notifications` table (bell icon); WhatsApp is future optional phase
- Deploy via `vercel --prod`
- Tarif default: TRUCKING=2, WAREHOUSE=1, CLEARANCE=2, FORWARDING=1

## Progress
### Done
- **Migration `109_sbu_token_rates.sql`**: table + seed data + RLS — applied successfully
- **Migration `110_deduct_tokens_on_jo_complete.sql`**: RPC + trigger `trg_deduct_tokens_on_jo_complete` on `job_orders` AFTER UPDATE of status — applied successfully
- **Owner settings page**: new "SBU Token Rates" tab with +/- stepper per SBU and save button
- **Owner server actions**: `getSbuTokenRates()`, `updateSbuTokenRate()`, `token_used_month` in `fetchTenantsAdmin()`
- **Tenant dashboard (`tenant/page.tsx`)**: warning banner kuning (≤5 TKN) dan merah (=0 TKN) di Energy Reserve card
- **Tenant token page (`tenant/token/page.tsx`)**: warning banner di balance card + `ConsumptionHistory` component (riwayat CONSUME per SBU)
- **Owner tenant table (`owner/tenants/page.tsx`)**: kolom "Token Used (Bulan Ini)" di grid card dan tabel view
- **Fixed nested JSX bug** (extra `</div>` at line 304 in `owner/tenants/page.tsx`)
- **Added `sbu_type` column** to `job_orders` in production (prerequisite for trigger)
- **Deployed to Vercel prod** (`vercel --prod`) — built 177 pages, live at https://sentralogis.com
- **Trigger verified**: completed test JO "HALU-TPS-0526-002-01", tenant HALU-001 deducted 2 tokens (391→389), CONSUME transaction recorded, reverted to pending
- **Migration `148_fix_crm_deal_won_trigger.sql`**: Fixed `crm_deals` stage transition error where trigger function attempted to update non-existent `entity_type` column on `md_entities`; changed to correctly set `is_customer = true` and `is_active = true`. Verified that updating deal stage to `WON` works successfully and the test deal was updated.

### In Progress
- (none)

### Blocked
- Local `npm run build` hangs/timeouts after 10 min with only Next.js banner output (no compile error/success). Likely environment issue, not code error.

## Key Decisions
- Trigger deducts tokens when `job_orders.status` changes to `COMPLETED`, `PEKERJAAN SELESAI`, `SELESAI`, `DONE`, `PAID`, `completed`, or `RECEIVED`
- `token_balance` floor at 0 (GREATEST(… - tokens, 0)) to prevent negative balance
- Trigger inserts `notifications` with `type='token_warning'` (≤5) or `token_critical` (=0), targeting `role='tenant_admin'`
- In-app notification first, WhatsApp later via pg_net/Edge Function
- Applied missing migrations via Supabase Dashboard SQL Editor (030 + 110); `sbu_type` column was missing on `job_orders` in production

## Next Steps
- (future) Activate/complete internal movements, repacking, bundling, and kitting features (see `140626.md`)

## Critical Context
- `wh_outbound_shipments` has proper FKs for `transporter_id`, `fleet_id`, `driver_id`, `customer_id`, `consignee_id` — embeds work here.
- `wh_transfer_orders` columns `transporter_id`, `fleet_id`, `driver_id`, `customer_id` lack FK constraints (only `consignee_id` has FK via migration 095). PostgREST embeds fail with 400.
- Token system is fully one-directional: `token_balance` only ever increased via TOPUP/GRANT; now CONSUME deductions happen via trigger.
- Production Supabase had missing migrations (030+110); applied manually via SQL Editor.
- Vercel deploys code only — Supabase migrations must be applied separately.

## Relevant Files
- `supabase/migrations/109_sbu_token_rates.sql`: creates sbu_token_rates table and seeds defaults
- `supabase/migrations/110_deduct_tokens_on_jo_complete.sql`: burn trigger RPC + notification logic
- `app/(dashboard)/owner/actions.ts`: adds `getSbuTokenRates()`, `updateSbuTokenRate()`, `token_used_month` to `fetchTenantsAdmin()`
- `app/(dashboard)/owner/settings/page.tsx`: adds SBU Token Rates tab with +/- stepper per SBU
- `app/(dashboard)/owner/tenants/page.tsx`: adds "Token Used" column to grid card and table
- `app/(dashboard)/tenant/token/page.tsx`: adds `ConsumptionHistory` component (riwayat CONSUME per SBU)
- `app/(dashboard)/tenant/page.tsx`: adds low balance warning banner in Energy Reserve card
- `supabase/migrations/148_fix_crm_deal_won_trigger.sql`: fixes the `WON` stage trigger function by setting `is_customer = true` instead of `entity_type` on `md_entities`
