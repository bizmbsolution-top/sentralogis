# P0.3 Runtime NativeGps Bridge Test Report

> STATUS: **BLOCKED — TOKEN → SYNC CHAIN FAILS ON DEVICE** (bridge chain PASS, authenticated server sync FAIL)

## Final Verdict (deterministic, post-deployment)

| Chain segment | Evidence (counts from `reports/phase_p0/p0_3_runtime_smoke.txt`, 764k lines) | Verdict |
|---|---|---|
| JS → Capacitor plugin call | `[GPS_FORENSIC] BEFORE_PLUGIN_CALL plugin=NativeGps method=startTracking` ×4, `method=startTracking` ×4, `[ENTRY_FORENSIC] native_gps_start_attempt` ×2 | **PASS** |
| Native plugin dispatch | `[GPS-JAVA-TRACE] NativeGps.startTracking invoked` (GpsPlugin), `[GPS-JAVA-TRACE] Service onStartCommand` ×26 | **PASS** |
| Foreground service + WakeLock | `SERVICE_STARTED: jobId=6a9925d5-19f1-4018-8e72-d55aa2f0ae45` ×2, `[WAKELOCK] acquired` ×165 | **PASS** |
| GPS location callbacks | `[GPS-JAVA-TRACE] location callback received` ×275, `[GPS-MANAGER] location received` ×303, `[ENTRY_FORENSIC] first_native_sample=true` ×301 | **PASS** |
| SQLite queue (native) | `[GPS_SYNC_FORENSIC] ENQUEUE queue_storage_source=sqlite` ×52, `[QUEUE-FIRST]` ×47 | **PASS** |
| JS token fetch (`fetchGpsSessionToken`) | `[GPS_TOKEN_REFRESH]` ×0, `[GPS-MANAGER] start requested` ×2 but never proceeded to schedule | **FAIL** |
| Native token receipt | `[GPS_AUTH] token received/valid/updated` ×0 | **FAIL** |
| Authenticated native sync | `[SYNC_ENGINE] Batch started/completed` ×0; `[GPS_AUTH] sync paused awaiting fresh token` ×24 (every ~90 s) | **FAIL** |
| Server `job_tracking` row | 0 rows for JO `6a9925d5-19f1-4018-8e72-d55aa2f0ae45` (verified via PostgREST) | **FAIL** |

**P0.3 FINAL VERDICT: BLOCKED.** The native GPS bridge (JS → plugin → service → WakeLock → callbacks → SQLite queue) is fully functional on device. The failure is **before native**: `NativeGpsManager.startTracking` calls `fetchGpsSessionToken(jobId)` (`POST /api/jo/{token}/gps-session`), which **always returned null** → `gpsSessionToken: undefined` passed to native → native sync forever in `[GPS_AUTH] sync paused awaiting fresh token` → 0 server rows.

## Root-cause analysis (token fetch always null)

- `/api/jo/[token]/gps-session` is **live in production** (verified: route deployed; unauthenticated POST → HTTP 401, not 404).
- Route logic (read at `app/api/jo/[token]/gps-session/route.ts`):
  1. `createClient()` (server cookie-based) → `auth.getUser()` → requires a valid **Supabase session cookie** in the request.
  2. Requires `user_metadata.profile_id` (`sessionProfileId`).
  3. Resolves `jo.driver.profile_id` via `driver_tenant_links` (`DriverPortalQuery.getJobOrderData`).
  4. Returns 401 if no profile_id, 403 if mismatch or inactive JO, else issues HS256 JWT (TTL 300 s, `GPS_SESSION_SECRET`).
- DB verified: JO `6a9925d5…` is `assigned`, driver `e0809ba5…` (ANTONIO, tenant `b0b30927…`), `driver_tenant_links` row exists → `profile_id f474cb1a-…`. So a **valid signed-in driver session with matching `profile_id` should get 200**.
- WebView does show `[Auth] Auth event: SIGNED_IN` ×10 (14:49–15:30) — the app session exists in the WebView.
- **Conclusion:** the WebView's `fetch('/api/jo/{token}/gps-session')` was **not authenticated at the server** (or returned 403). Likely causes, in priority order:
  1. Supabase session cookie not attached to the WebView `fetch` (Capacitor WebView cookie isolation / cookie domain vs `www.sentralogis.com`).
  2. `user_metadata.profile_id` missing/mismatched vs the JO's linked driver profile.
  3. Request fired before cookie persisted (SIGNED_IN for PID 22134 first observed at 15:21:50, while its `startTracking` ran at 15:18:02).
- Note: `startTracking` on failure logs nothing (returns null silently); `scheduleTokenRefresh` is only reached on success — so the failure was silent.

## Build Identity (confirmed clean — earlier "corrupt file" was a tooling artifact)

| Field | Value |
|---|---|
| GIT_COMMIT | `6c73b7a3d741569de1f27a797439152d36546e13` |
| `npm run build` | **PASS** |
| `gradlew assembleDebug` | **PASS** (source valid, compiles) |
| APK_PATH | `android/app/build/outputs/apk/debug/app-debug.apk` |
| APK_SHA256 | `37F74B23AC642DB2F3765899AE5FB36CB2E85205955B76D04D91F26D9860684F` |
| APK_BUILD_TIMESTAMP | `2026-08-19 13:59:10` |
| Installed & running on device | Confirmed (matches source: `assembleDebug UP-TO-DATE`, Java file LastWriteTime 11:25:33 < build 13:59) |
| `GpsForegroundService.java` final state | 601 lines, compiles clean, contains all runtime markers observed on device |

## Production Deployment Verification (Phase 1 — PASS)

| Check | Result |
|---|---|
| `POST https://www.sentralogis.com/api/jo/6a9925d5-19f1-4018-8e72-d55aa2f0ae45/gps-session` (unauthenticated) | **HTTP 401** (route live; no longer 404) |
| Production deployment | PASS |

## Evidence Files

- `reports/phase_p0/p0_3_runtime_smoke.txt` — full capture (764k lines, 14:47–15:39)
- `reports/phase_p0/p0_3_bridge_smoke.txt` — earlier bridge smoke (14:09)
- `reports/phase_p0/screen.png`, `screen_b.png` — screenshots

## Next Actions (require user decision — no silent fix)

1. **Diagnose why WebView `POST /gps-session` is unauthenticated**:
   - Reproduce from a normal browser with a driver session: confirm 200 when signed in as the JO's linked driver, 403/401 otherwise.
   - Inspect the Supabase cookie (`sb-<ref>-auth-token`) inside the Capacitor WebView (cookie domain, same-site, persistence) — check whether WebView fetch attaches it.
   - Add temporary JS logging in `fetchGpsSessionToken` to capture `res.status` (only a diagnostic patch, then rebuild/reinstall/re-run).
2. **Fix token delivery** once root cause is confirmed (e.g., attach `Authorization: Bearer <supabase_session>` instead of relying on cookies, or `credentials: 'include'`), then rebuild APK → reinstall → re-run P0.3.
3. After token chain passes: re-run full P0.3 smoke (start tracking ≥60 s) and verify a `job_tracking` row appears in Supabase for JO `6a9925d5-19f1-4018-8e72-d55aa2f0ae45`.
4. Only then proceed to P1 phases (Screen ON/OFF, Movement, Stop, Restart, Offline).
