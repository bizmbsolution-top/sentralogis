# P0.3.1 GPS Session Token Auth Forensics — Root Cause & Fix Report

> STATUS: **RESOLVED — WEBVIEW TOKEN AUTH FIXED; END-TO-END SYNC VERIFIED (job_tracking rows flowing)**
> Scope: forensic diagnosis of why `fetchGpsSessionToken` always returned null in the Capacitor WebView (P0.3 blocker).

## Executive Summary

P0.3 proved the native GPS bridge (JS → plugin → foreground service → WakeLock → SQLite queue) was fully functional; the ONLY blocker was that `POST /api/jo/{token}/gps-session` always returned `null` on device, so native sync never received a token and paused forever (`sync paused awaiting fresh token`).

This phase (P0.3.1) proved the root cause with a 10-step forensic procedure, found a **second production blocker** (missing `GPS_SESSION_SECRET`), and delivered a minimal, non-invasive fix that makes the full chain work end-to-end on the physical device.

## Verdicts (deterministic)

| Step | Check | Result |
|---|---|---|
| S1 | Inspect `fetchGpsSessionToken` impl (`lib/services/NativeGpsManager.ts`) | relative URL, POST, no headers, silent `null` on `!ok` and `catch` |
| S2 | Add client forensic logging (`[GPS_TOKEN_FORENSIC]`) | response status + error body now visible in logcat |
| S3 | Inspect Supabase session before fetch (`supabase.auth.getSession()`) | **`session_exists=false` on device at fetch time** |
| S4 | Race detection (SIGNED_IN vs startTracking timestamps) | race exists (startTracking before SIGNED_IN in some PIDs) but NOT the root cause |
| S5 | Server-side forensic logging in `gps-session` route | `[GPS_SESSION_FORENSIC]` markers deployed |
| S6 | Desktop/curl control group with a real driver session cookie | **200 + JWT** → auth contract WORKS with a valid cookie; exposed missing `GPS_SESSION_SECRET` (500) |
| S7 | Cookie transport audit in WebView | **`document.cookie` empty; WebView cookie DB contains zero sentralogis cookies** → no Supabase cookie ever transported |
| S8 | Minimum fix: Bearer token via `Authorization` header + server bearer fallback | **device: 200 → token_received=true → native batch sync → job_tracking rows** |
| S9 | Build / deploy / install | web build PASS; prod deploy PASS; APK reinstall PASS |
| S10 | Physical device rerun | **100+ job_tracking rows for JO `6a9925d5…`** |

## Root Cause (two independent blockers)

### Blocker #1 — RACE/COOKIE (primary, WebView side)
- The driver app authenticates via **custom `localStorage` session** (`sentralogis_driver_session`, with `driver_id`/`profile_id`/`tenant_id`) through `/api/driver/login`.
- The `gps-session` endpoint authenticates via the **Supabase session cookie** (`createServerClient` + `auth.getUser()`).
- In the Capacitor WebView these two are disconnected: at the moment `fetchGpsSessionToken` fires, `document.cookie` is **empty** and `supabase.auth.getSession()` = null — the WebView cookie store never holds the `sb-*` auth cookie (verified by direct SQLite cookie-DB scan: zero sentralogis entries).
- Result: server `auth.getUser()` → null → 401 `Missing profile_id` → client returns `null` silently.

### Blocker #2 — MISSING ENV (server side, production)
- Even with a VALID signed-in session cookie, token creation threw `GPS_SESSION_SECRET is not configured` (`lib/auth/gpsSession.ts`) because the env var was absent in Vercel production (confirmed via `vercel env ls`).
- Fixed by adding `GPS_SESSION_SECRET` to Vercel production env (random 48-char value, encrypted).

## The Fix (minimal, non-invasive)

1. **`app/api/driver/login/route.ts`** — response now includes `session: { access_token, refresh_token, expires_at }` (no behavior change to existing fields).
2. **`lib/hooks/useDriverAuth.tsx`** — `DriverSession` now stores `access_token` / `refresh_token` / `expires_at` from login response (persisted in localStorage session).
3. **`lib/services/NativeGpsManager.ts`** — `fetchGpsSessionToken`:
   - reads session via `supabase.auth.getSession()` first (cookie path),
   - falls back to the driver's localStorage `access_token` when cookie absent,
   - sends `Authorization: Bearer <token>` header on the fetch,
   - logs forensic markers (`session_exists`, `cookie_names`, `bearer_available`, `response_status`, `response_body_error`).
4. **`app/api/jo/[token]/gps-session/route.ts`** — if the cookie path yields no `profile_id`, falls back to validating `Authorization: Bearer` via the admin client (`getUser(bearer)`) and uses that user's `user_metadata.profile_id`.

## Device Proof (S10 rerun, JO `6a9925d5-19f1-4018-8e72-d55aa2f0ae45`)

```
17:12:59  [GPS-MANAGER] start requested: 6a9925d5...
17:12:59  [GPS_TOKEN_FORENSIC] session_exists=false user_exists=false
          cookie_read_skipped_or_empty
          bearer_from_driver_session=true
          bearer_available=true
17:13:04  [GPS_TOKEN_FORENSIC] response_status=200 response_ok=true
          token_received=true
17:13:04  SERVICE_STARTED: jobId=6a9925d5... (native restarted with token)
17:14:49  [SYNC_ENGINE] Batch started. 50 PENDING records.
          PATCH /api/jo/6a9925d5... batch_count=50
17:17:22  [GPS_SYNC_FORENSIC] response_ok=true
          FILTER_QUEUE mark_synced=50
DB        job_tracking count = 100 rows for JO 6a9925d5...
```

## Evidence / Artifacts

- `lib/services/NativeGpsManager.ts` — forensic logging + bearer fallback
- `app/api/jo/[token]/gps-session/route.ts` — server forensic logging + bearer fallback
- `app/api/driver/login/route.ts` — returns session tokens
- `lib/hooks/useDriverAuth.tsx` — persists tokens
- Vercel prod env — `GPS_SESSION_SECRET` added
- Device logcat — `[GPS_TOKEN_FORENSIC]` / `[GPS_SYNC_FORENSIC]` / `[SYNC_ENGINE]` chains (this run)

## Follow-ups (recommended, not blocking)

- P0.3 report says "BLOCKED" — should be updated to "FIXED" after this phase.
- Next phases from P0.3 Next Steps: Screen ON/OFF, Movement, Stop, Restart, Offline — now unblocked.
- `GPS_SESSION_SECRET` should be added to all environments (preview/dev) and documented in repo README.