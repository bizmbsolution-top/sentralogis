# 04_security_permission_model.md

## Can SentraForge securely operate as a multi‑tenant enterprise logistics platform?

**Short answer:** Yes – the core security architecture (Supabase Auth + Row‑Level Security policies, tenant‑scoped identifiers, and role‑based checks) provides a solid foundation for multi‑tenant isolation and secure access.  However, a few hardening actions are required to move from *acceptable* to *robust* security for a production SaaS offering.

---

## 1. Authentication Architecture Audit

| Aspect | Current Implementation | Security Observations |
|--------|------------------------|-----------------------|
| **Provider** | Supabase Auth (email‑password, magic‑link, OAuth possible) | Managed, up‑to‑date, supports MFA if enabled. |
| **Login flow** | Front‑end calls `supabase.auth.signIn` / `signInWithPassword`; token returned as JWT stored in **localStorage**. | JWT‑based stateless sessions are standard, but localStorage is vulnerable to XSS – consider using **httpOnly Secure cookies** for the access token. |
| **Session handling** | `supabase.auth.getSession()` reads stored session; refresh token auto‑refresh via Supabase client. | Refresh tokens are also stored in localStorage – same XSS risk. |
| **JWT contents** | `sub` (user id), `role`, `tenant_id` (in `user_metadata`), `exp`. | Proper claims are present; ensure `exp` is short (≤ 1 h) and refresh token rotation is enabled. |
| **Token storage** | Browser `localStorage` (client) and Supabase Realtime cookie for server‑side connections. | Recommend **Secure, SameSite=Strict** cookie for API calls (via `supabase.auth.api.setAuthCookie`). |
| **Middleware protection** | API routes (`app/api/*`) call `supabase.auth.getUser()` and then perform role/tenant checks in code. | Works, but centralise checks in a **middleware** (`middleware.ts`) to avoid accidental omission. |
| **Public routes** | Landing pages, `/track/fwd/[token]` (public token), static assets. | No auth required – ensure token‑based tracking URLs are **single‑use, time‑limited** and signed (HMAC). |

**Key entry points**
- `/auth/*` – login, signup, password reset, magic link.
- `app/api/**` – all protected business APIs (e.g., `/api/jo/[token]`, `/api/whatsapp/webhook`).
- Client side components that call `supabase.auth.getUser()` before rendering admin UI.

## 2. User Identity Model

| Table / Source | Purpose | Tenant linkage | Role handling |
|----------------|---------|----------------|--------------|
| `auth.users` (Supabase) | Core authentication record (email, password hash) | `user_metadata.tenant_id` (string/UUID) | `user_metadata.role` (admin, driver, vendor, customer) |
| `profiles` (custom) – `driver_profiles`, `customer_profiles` etc. | Business profile data (photos, licence, contact) | Foreign key to `auth.users.id` + `tenant_id` column | No direct role column – derived from `auth.users` metadata |
| `auth.roles` (Supabase) | Pre‑defined role definitions (used in RLS policies) | Not tenant‑scoped; combined with `tenant_id` claim at runtime |

**Observations**
- The tenant identifier is stored **both** in `user_metadata` (JWT claim) **and** on every business table (`tenant_id`).  This redundancy allows RLS policies to enforce isolation reliably.
- Role checks are performed in code (`if (user.role === 'admin') …`) and occasionally in RLS (`auth.role() = 'driver'`).  Align both layers to avoid privilege escalation.

## 3. Permission & Row‑Level Security (RLS) Model

1. **Tenant isolation** – All tables participating in the core execution model (`work_orders`, `work_order_items`, `job_orders`, `job_tracking`, etc.) contain a `tenant_id` column.  RLS policies (see `040_tenant_sbus_rls.sql`, `066_fix_rls_use_tenant_users.sql`) enforce:
   ```sql
   CREATE POLICY tenant_isolation ON <table>
   USING (tenant_id = current_setting('request.jwt.claim.tenant_id')::uuid);
   ```
2. **Role‑based access** – Policies also filter on `auth.role()` for SBU‑specific tables, e.g., drivers can only view their own `job_orders`.
3. **Temporary RLS disables** – Migrations `005_disable_rls.sql` are used only during bulk imports; they are re‑enabled in the same migration batch.  Verify that no production migration leaves RLS disabled.
4. **Audit trail** – `audit_log` table is populated via triggers (`013_fix_trigger_notifications.sql`).  Every INSERT/UPDATE/DELETE on protected tables generates a log entry with `user_id`, `tenant_id`, and the executed SQL statement.

### Security gaps identified
- **Scattered RLS definitions** – Policies are spread across many migration files; any new table risks missing a policy.
- **No automated verification** – No CI step checks that every table with `tenant_id` has an associated RLS policy.
- **Client‑side role enforcement** – Some UI components rely solely on front‑end role checks; a malicious client could call the API directly.  Ensure all critical actions are gated in the server (API route middleware).

## 4. Multi‑Tenant Viability Assessment

| Criterion | Current State | Recommendation |
|-----------|----------------|----------------|
| **Data isolation** | Enforced by `tenant_id` + RLS on all core tables. | Consolidate RLS into a single script or generate from a template to guarantee coverage. |
| **Authentication strength** | Supabase Auth with JWT. | Enable **MFA** for privileged users and move JWT storage to **httpOnly cookies**. |
| **Authorization consistency** | Role checks exist both in code and RLS. | Adopt a **centralised permission service** (e.g., `lib/permissions.ts`) used by all API routes. |
| **Secret management** | Env vars (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) are exposed to the browser (as required). | Keep only the **service_role** key on the server; rotate keys regularly. |
| **Public token URLs** (`/track/fwd/[token]`) | Single‑use token generated on WO creation. | Add **expiry timestamp** and HMAC signature verification. |
| **Audit completeness** | `audit_log` captures most DB actions; some status changes are emitted only via app events. | Extend triggers to log **status‑change mutations** or emit them to the audit table via Supabase functions. |

### Verdict
SentraForge possesses the essential mechanisms to operate securely as a multi‑tenant SaaS platform.  The combination of Supabase‑managed authentication, JWT with tenant claims, and row‑level security provides **strong logical isolation**.  With the recommended hardening steps (centralised RLS, cookie‑based JWT, MFA, and full audit coverage) the platform can meet enterprise‑grade security expectations.

---

## 5. Recommendations – Immediate Actionable Items

1. **Migrate JWT storage** to Secure, SameSite cookies and deprecate localStorage usage.
2. **Enable MFA** for admin and driver roles via Supabase Auth settings.
3. **Create a RLS policy generator** script that scans the schema for `tenant_id` columns and emits a migration file ensuring every table receives a `tenant_isolation` policy.
4. **Audit all API routes** for missing server‑side role checks; wrap them with a shared `requireAuth({role:['admin','driver']})` middleware.
5. **Add expiry to public tracking tokens** and verify signatures on the `/track/fwd/[token]` page.
6. **Integrate generated Supabase TypeScript types** (`npx supabase gen types typescript --local`) to replace the placeholder `Database = any`.
7. **Automate audit log validation** in CI – ensure every mutation on a protected table creates a corresponding `audit_log` entry.

Implementing these measures will close the identified gaps and give confidence that SentraForge can safely serve multiple tenant organisations at scale.
