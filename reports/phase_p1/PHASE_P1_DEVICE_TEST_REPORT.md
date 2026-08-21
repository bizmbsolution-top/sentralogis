# PHASE P1 – Native GPS + WakeLock Device Test Report

## Device
- Model: Samsung A32 (SM-A325F)
- Android: 13 (API 33)
- APK: android/app/build/outputs/apk/debug/app-debug.apk (8.5 MB), versionName 1.0 / versionCode 1
- Build: debug build 2026-08-19 11:26 (lastUpdateTime on device 2026-08-19 13:24, install -r Success)
- Git commit: 6c73b7a3d741569de1f27a797439152d36546e13 (2026-08-19 10:22:56 +0700)
- Production API: https://www.sentralogis.com

## P0 Token Smoke Test

Result: **FAIL** — native tracking never started on the physical device.

Device evidence (logcat pid 3373, tag Capacitor/Console, timestamps preserved):

```
13:41:11.592 [GPS-MANAGER] start requested: 6a9925d5-19f1-4018-8e72-d55aa2f0ae45
13:41:11.602 [GPS_FORENSIC] BEFORE_PLUGIN_CALL
13:41:11.645 plugin=NativeGps
13:41:11.646 [GPS_FORENSIC] PLUGIN_CALL_EXCEPTION
13:41:11.646 plugin=NativeGps
13:41:11.646 message="NativeGps" plugin is not implemented on android
13:41:11.646 stack=Error: "NativeGps" plugin is not implemented on android
13:41:11.647 [GPS-MANAGER] Error starting tracking. Retrying in 3s... Error: "NativeGps" plugin is not implemented on android
13:41:11.648 [ENTRY_FORENSIC] native_gps_start_result=failure
13:41:11.650 [ENTRY_FORENSIC] gps_status=error
13:41:14.670 (retry) plugin=NativeGps ... "NativeGps" plugin is not implemented on android
```

Additionally:
- No `[GPS_AUTH]` marker appeared.
- No `[SYNC_ENGINE]` marker appeared.
- No `[WAKELOCK]` marker appeared.
- No `[QUEUE-FIRST]` marker appeared.
- No `job_tracking` server records were created by native sync (native sync path never ran).

| Check | Result |
|---|---|
| GPS session issued | FAIL (never reached native; JS startTracking aborts on plugin error) |
| Native token propagation | FAIL (plugin bridge missing, token never delivered to service) |
| Authorization accepted | FAIL (no native HTTP sync occurred) |
| 401 | NO |
| 403 | NO |
| JWT leakage | NO |
| Verdict | **FAIL** |

Per P1 rule: P0 FAIL → STOP all subsequent P1 device tests.

## Root Cause

`GpsPlugin.java` (class annotated `@CapacitorPlugin(name = "NativeGps")`) compiles into the
APK dex, but is **never registered with the Capacitor bridge**:

- `MainActivity.java` (android/app/src/main/java/com/sentralogis/driver/MainActivity.java) does NOT
  call `registerPlugin(GpsPlugin.class)` — it only handles deep links.
- `capacitor.config.ts` declares no plugin registration (`plugins` only contains `DeepLinks`).
- No other `.java`/`.gradle`/`.xml`/`.json` in `android/` references `NativeGps` registration.

Consequence: JS calls `Capacitor.registerPlugin("NativeGps", ...)` (which resolves to a
no-op proxy) and any call throws `"NativeGps" plugin is not implemented on android`.
The native foreground service, WakeLock, SQLite queue, and token lifecycle therefore never execute
on a real device, even though the code compiled and the Gradle build passed (P0.2 PASS was
static/build-level only).

This is a runtime bridging defect that static inspection + `gradlew assembleDebug` cannot detect,
which is exactly the gap P1 physical-device testing was designed to expose.

## P1-01 Screen ON

**NOT EXECUTED** — prerequisite P0 smoke test FAILED (STOP per rules #8/#9/#10).

## P1-02 Screen OFF 10 Minutes

**NOT EXECUTED** — prerequisite P0 smoke test FAILED.

## P1-03 Movement

**NOT EXECUTED** — prerequisite P0 smoke test FAILED.

## P1-04 Stop Lifecycle

**NOT EXECUTED** — prerequisite P0 smoke test FAILED.

## P1-05 Service Restart

**NOT EXECUTED** — prerequisite P0 smoke test FAILED.

## P1-06 Offline

**NOT EXECUTED** — prerequisite P0 smoke test FAILED.

## Phase 10 — Automated Evidence Analysis

Applied to collected evidence (logcat_token.txt, 149,069 bytes, 2026-08-19):

- GPS callback count: 0 (no `[GPS-JAVA-TRACE] location callback received`)
- Queue count: 0 (no `[QUEUE-FIRST]`)
- Sync success count: 0 (no `[SYNC_ENGINE] response_ok`)
- 401 count: 0
- 403 count: 0
- ERROR count: 1 (plugin-not-implemented exception, repeated on retry)
- Exception count: repeated `"NativeGps" plugin is not implemented on android`
- WakeLock acquire count: 0 (`[WAKELOCK] acquired` never logged)
- WakeLock release count: 0
- Server row count: N/A (no driver_id/job_order_id supplied by sync; no sync ran)
- duplicate client_ping_id: N/A
- timestamp gaps / records before-during-after screen-off: N/A (native tracking inactive)

## Phase 11 — Security Check

Searched all collected logs for `eyJ`, `Authorization:`, `Bearer `, `gpsSessionToken=`, `TOKEN=`.

- logcat_token.txt: 0 matches
- logcat_token_err.txt: 0 matches
- DEVICE_METADATA.txt: 1 textual match, but it is the documented contract description
  ("Authorization: Bearer <gps token>"), not a real token.

**JWT leakage: PASS** (no plaintext JWT in any logcat evidence).

## FINAL GATE

| Gate | Result |
|---|---|
| P0 Token Smoke Test | **FAIL** |
| P1-01 Screen ON | NOT EXECUTED (blocked by P0) |
| P1-02 Screen OFF | NOT EXECUTED (blocked by P0) |
| P1-03 Movement | NOT EXECUTED (blocked by P0) |
| P1-04 Stop lifecycle | NOT EXECUTED (blocked by P0) |
| P1-05 Service restart | NOT EXECUTED (blocked by P0) |
| P1-06 Offline | N/A |
| JWT leakage | **PASS** |
| Server GPS continuity | FAIL (no native GPS accepted by server) |
| FINAL VERDICT | **FAIL** |

## Deliverables Produced

```
reports/phase_p1/
├── DEVICE_METADATA.txt
├── logcat_token.txt
├── logcat_token_err.txt
└── PHASE_P1_DEVICE_TEST_REPORT.md
```

No job_tracking_*.csv / logcat_01..06 files were created because the corresponding device tests
were not executed (P0 prerequisite FAIL). No fake evidence was generated. No source code was
modified. No migration or DB change was made.

## Forensics Summary

1. **What was actually tested:** Physical device installation (Samsung A32, Android 13) of the
   current debug APK and a P0 GPS-session smoke test on a real assigned JO (device screen showed
   the JO; diagnostic overlay present but non-blocking).
2. **Tests PASS:** Installation (APK install -r Success); Security check (no JWT leakage).
3. **Tests FAIL:** P0 Token Smoke Test (native GPS start fails on device).
4. **Tests not executed:** P1-01 .. P1-06 (stopped per P1 rules after P0 FAIL).
5. **Evidence:** Device logcat shows `"NativeGps" plugin is not implemented on android` at
   13:41:11, `native_gps_start_result=failure`, `gps_status=error`, repeated on 3s retry, and
   zero `[GPS_AUTH]`/`[SYNC_ENGINE]`/`[WAKELOCK]`/`[QUEUE-FIRST]` markers.
6. **Root cause:** `GpsPlugin.java` is compiled but never registered with the Capacitor bridge —
   no `registerPlugin(GpsPlugin.class)` in `MainActivity.java`, and no plugin registration in
   `capacitor.config.ts` — so the JS→native bridge resolves to a no-op and throws. P0.2 PASS was
   build/static-based; it missed this runtime bridging failure.
7. **May P2 begin?** **NO.** P1 is FAIL. Before any further phases, P0.2 must be fixed at the
   Android bridge level (register the NativeGps plugin in MainActivity / Capacitor config),
   rebuilt, and P0 smoke retested on a physical device until native tracking actually runs.
