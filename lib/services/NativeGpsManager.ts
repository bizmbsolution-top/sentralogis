import { registerPlugin, Capacitor } from "@capacitor/core";

interface NativeGpsPlugin {
  startTracking(options: { jobId: string; apiUrl: string; gpsSessionToken?: string }): Promise<void>;
  updateToken(options: { gpsSessionToken: string }): Promise<void>;
  stopTracking(): Promise<void>;
  addListener(eventName: "onLocationUpdate", listenerFunc: (data: any) => void): Promise<any>;
  isGpsEnabled(): Promise<{ enabled: boolean }>;
  openLocationSettings(): Promise<void>;
  speakText?(options: { text: string; lang: string }): Promise<void>;
  getQueueStatus?(): Promise<{ pendingCount: number; totalCount: number }>;
  triggerSync?(): Promise<void>;
}

const NativeGps = typeof window !== "undefined" ? registerPlugin<NativeGpsPlugin>("NativeGps") : null;

// Forensic-only redaction hash (FNV-1a 32-bit) — NOT cryptographic; used solely
// to avoid logging raw user/profile UUIDs in device logs.
function forensicHash(id: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return "h" + h.toString(16).padStart(8, "0");
}

export type NativeGpsState = {
  status: "idle" | "loading" | "active" | "error";
  permission: "unknown" | "granted" | "denied";
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  speed: number | null;
  battery: number | null;
  recordedAt: string | null;
  nativeServiceActive: boolean;
  consecutiveFailures: number;
  pingCount: number;
  errorMessage?: string;
};

type StateSubscriber = (state: NativeGpsState) => void;

class NativeGpsManagerClass {
  private consumers = new Set<string>();
  private activeJobId: string | null = null;
  private listener: any = null;
  private subscribers = new Set<StateSubscriber>();
  private tokenRefreshTimer: any = null;
  private tokenRefreshFailures: number = 0;
  private currentSessionToken: string | null = null;
  
  private async fetchGpsSessionToken(token: string): Promise<string | null> {
    const reqTs = Date.now();
    console.log(`[GPS_TOKEN_FORENSIC] request_start ts=${reqTs} job=${token.slice(0, 8)}`);
    try {
      // STEP 3: inspect WebView Supabase session state immediately before request
      let bearerToken: string | null = null;
      try {
        const { supabase } = await import("@/lib/supabaseClient");
        const { data: sessData } = await supabase.auth.getSession();
        const sessionExists = !!sessData?.session;
        const user = sessData?.session?.user ?? null;
        const userId = user?.id ?? null;
        const profileId = user?.user_metadata?.profile_id ?? null;
        bearerToken = sessData?.session?.access_token ?? null;
        console.log(`[GPS_TOKEN_FORENSIC] session_exists=${sessionExists} user_exists=${!!user} user_id=${userId ? forensicHash(userId) : "none"} profile_id=${profileId ? forensicHash(String(profileId)) : "none"} bearer_from_supabase=${!!bearerToken}`);
      } catch {
        console.log(`[GPS_TOKEN_FORENSIC] session_inspect_error`);
      }
      // STEP 7: cookie transport audit — enumerate cookie NAMES only (never values)
      try {
        if (typeof document !== "undefined" && document.cookie) {
          const names = document.cookie.split(";").map((c) => c.trim().split("=")[0]).filter(Boolean);
          const hasSb = names.some((n) => n.startsWith("sb-"));
          console.log(`[GPS_TOKEN_FORENSIC] cookie_count=${names.length} has_sb_auth_cookie=${hasSb} cookie_names=${JSON.stringify(names.slice(0, 12))}`);
        } else {
          console.log(`[GPS_TOKEN_FORENSIC] cookie_read_skipped_or_empty`);
        }
      } catch {
        console.log(`[GPS_TOKEN_FORENSIC] cookie_read_error`);
      }
      // Bearer fallback from the driver's localStorage session (set by /api/driver/login)
      if (!bearerToken) {
        try {
          const stored = localStorage.getItem("sentralogis_driver_session");
          if (stored) {
            const parsed = JSON.parse(stored);
            bearerToken = parsed?.access_token ?? null;
            console.log(`[GPS_TOKEN_FORENSIC] bearer_from_driver_session=${!!bearerToken}`);
          }
        } catch {
          console.log(`[GPS_TOKEN_FORENSIC] bearer_read_error`);
        }
      }
      console.log(`[GPS_TOKEN_FORENSIC] bearer_available=${!!bearerToken}`);

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (bearerToken) headers["Authorization"] = `Bearer ${bearerToken}`;

      const res = await fetch(`/api/jo/${token}/gps-session`, { method: "POST", headers });
      const status = res.status;
      console.log(`[GPS_TOKEN_FORENSIC] response_status=${status}`);
      console.log(`[GPS_TOKEN_FORENSIC] response_ok=${res.ok}`);
      if (status === 401) console.log(`[GPS_TOKEN_FORENSIC] SERVER_AUTH=401`);
      else if (status === 403) console.log(`[GPS_TOKEN_FORENSIC] SERVER_AUTH=403`);
      else console.log(`[GPS_TOKEN_FORENSIC] SERVER_AUTH=${status}`);
      if (!res.ok) {
        try {
          const body = await res.json();
          const err = typeof body?.error === "string" ? body.error.slice(0, 120) : String(body?.error ?? "");
          console.log(`[GPS_TOKEN_FORENSIC] response_body_error=${err}`);
        } catch {
          console.log(`[GPS_TOKEN_FORENSIC] response_body_error=unparseable`);
        }
        return null;
      }
      const data = await res.json();
      const hasToken = !!data.gps_session_token;
      console.log(`[GPS_TOKEN_FORENSIC] token_received=${hasToken}`);
      return data.gps_session_token || null;
    } catch {
      console.log(`[GPS_TOKEN_FORENSIC] fetch_exception`);
      return null;
    }
  }

  private parseJwtExpiry(token: string): number | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const parsed = JSON.parse(jsonPayload);
      return parsed.exp || null;
    } catch (e) {
      return null;
    }
  }

  private scheduleTokenRefresh(token: string, newSessionToken: string) {
    if (this.tokenRefreshTimer) clearTimeout(this.tokenRefreshTimer);
    
    this.currentSessionToken = newSessionToken;
    const exp = this.parseJwtExpiry(newSessionToken);
    
    let refreshDelayMs = 4 * 60 * 1000; // default 4 mins
    if (exp) {
      const nowSec = Math.floor(Date.now() / 1000);
      const timeToExpirySec = exp - nowSec;
      // Refresh 75 seconds before expiry
      refreshDelayMs = Math.max(10000, (timeToExpirySec - 75) * 1000); 
    }
    
    this.tokenRefreshFailures = 0; // reset failures on success
    console.log(`[GPS_TOKEN_REFRESH] scheduled in ${Math.round(refreshDelayMs/1000)}s`);

    this.tokenRefreshTimer = setTimeout(async () => {
      this.attemptTokenRefresh(token);
    }, refreshDelayMs);
  }

  private async attemptTokenRefresh(token: string) {
    if (this.activeJobId !== token || !this.state.nativeServiceActive) return;
    
    const sessionToken = await this.fetchGpsSessionToken(token);
    if (sessionToken) {
      console.log(`[GPS_TOKEN_REFRESH] success`);
      this.currentSessionToken = sessionToken;
      if (NativeGps) {
        await NativeGps.updateToken({ gpsSessionToken: sessionToken });
      }
      this.scheduleTokenRefresh(token, sessionToken);
    } else {
      this.tokenRefreshFailures++;
      // Exponential backoff: 10s, 20s, 40s, max 60s
      const backoffSec = Math.min(60, 10 * Math.pow(2, this.tokenRefreshFailures - 1));
      console.log(`[GPS_TOKEN_REFRESH] retry in ${backoffSec}s (attempt ${this.tokenRefreshFailures})`);
      this.tokenRefreshTimer = setTimeout(() => {
        this.attemptTokenRefresh(token);
      }, backoffSec * 1000);
    }
  }
  
  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (this.activeJobId && this.currentSessionToken && this.tokenRefreshFailures > 0) {
          console.log(`[GPS_TOKEN_REFRESH] network recovered, retrying immediate refresh`);
          if (this.tokenRefreshTimer) clearTimeout(this.tokenRefreshTimer);
          this.attemptTokenRefresh(this.activeJobId);
        }
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.activeJobId && this.currentSessionToken) {
          const exp = this.parseJwtExpiry(this.currentSessionToken);
          const nowSec = Math.floor(Date.now() / 1000);
          if (exp && (exp - nowSec < 90)) {
            console.log(`[GPS_TOKEN_REFRESH] app resumed and token near expiry, forcing refresh`);
            if (this.tokenRefreshTimer) clearTimeout(this.tokenRefreshTimer);
            this.attemptTokenRefresh(this.activeJobId);
          }
        }
      });
    }
  }

  private state: NativeGpsState = {
    status: "idle",
    permission: "unknown",
    latitude: null,
    longitude: null,
    accuracy: null,
    speed: null,
    battery: null,
    recordedAt: null,
    nativeServiceActive: false,
    consecutiveFailures: 0,
    pingCount: 0,
  };

  private setState(patch: Partial<NativeGpsState>) {
    this.state = { ...this.state, ...patch };
    this.notifySubscribers();
  }

  private notifySubscribers() {
    this.subscribers.forEach(sub => sub(this.state));
  }

  public subscribe(callback: StateSubscriber): () => void {
    this.subscribers.add(callback);
    callback(this.state); // Instantly emit current state to new subscriber
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public getState(): NativeGpsState {
    return this.state;
  }

  public async getQueueStatus(): Promise<{ pendingCount: number; totalCount: number }> {
    try {
      if (NativeGps?.getQueueStatus) {
        return await NativeGps.getQueueStatus();
      }
    } catch (e) {
      console.warn("[GPS Native Engine] Failed to getQueueStatus:", e);
    }
    return { pendingCount: 0, totalCount: 0 };
  }

  public async triggerSync(): Promise<void> {
    try {
      if (NativeGps?.triggerSync) {
        await NativeGps.triggerSync();
      }
    } catch (e) {
      console.warn("[GPS Native Engine] Failed to triggerSync:", e);
    }
  }

  public async registerConsumer(consumerId: string, jobId: string) {
    if (typeof window === "undefined") return;
    const isNativeApp = Capacitor.isNativePlatform() || navigator.userAgent.includes('SentraLogis_AndroidApp');
    if (!isNativeApp) return;
    if (!NativeGps) return;
    
    const alreadyRegistered = this.consumers.has(consumerId);
    const jobIdChanged = this.activeJobId !== jobId && jobId !== "unknown" && jobId != null;
    
    if (alreadyRegistered && !jobIdChanged) {
      // Nothing changed for this consumer, just notify
      this.notifySubscribers();
      return;
    }

    const isFirst = !alreadyRegistered && this.consumers.size === 0;
    this.consumers.add(consumerId);
    this.activeJobId = jobId;
    
    if (isFirst || jobIdChanged) {
      if (isFirst) this.setState({ status: "loading" });
      console.log(`[ENTRY_FORENSIC] native_gps_startTracking_called=true`);
      await this.startTracking();
    } else {
      // Already running with same jobId, just broadcast current state
      console.log(`[GPS-MANAGER] service active: true, attaching new consumer ${consumerId}`);
      this.notifySubscribers();
    }
  }

  public async unregisterConsumer(consumerId: string) {
    if (typeof window === "undefined") return;
    const isNativeApp = Capacitor.isNativePlatform() || navigator.userAgent.includes('SentraLogis_AndroidApp');
    if (!isNativeApp) return;
    
    const existed = this.consumers.delete(consumerId);
    if (!existed) return;

    console.log(`[GPS-MANAGER] unregister consumer: ${consumerId}`);
    console.log(`[GPS-MANAGER] consumer count: ${this.consumers.size}`);

    // [PATCH H-02] Do NOT stop native service when last consumer unregisters.
    // The native foreground service must continue running independently of
    // React component lifecycle (page navigation, component remount).
    // Stopping the service here was the cause of GPS gaps during navigation
    // and a vulnerability window where trackingActive=false could prevent
    // automatic restart after process death.
    // The service should only be stopped via explicit stopAllTracking().
  }

  private async startTracking() {
    console.log(`[GPS-MANAGER] start requested: ${this.activeJobId}`);
    let forensicPlugin = "Unknown";
    let forensicMethod = "Unknown";
    try {
      const isNativeApp = typeof window !== 'undefined' ? (Capacitor.isNativePlatform() || navigator.userAgent.includes('SentraLogis_AndroidApp')) : false;

      const { Geolocation } = await import("@capacitor/geolocation");
      
      forensicPlugin = "@capacitor/geolocation";
      forensicMethod = "checkPermissions";
      console.log(`[GPS_FORENSIC] BEFORE_PLUGIN_CALL\nplugin=${forensicPlugin}\nmethod=${forensicMethod}\nisNative=${isNativeApp}\ntimestamp=${new Date().toISOString()}`);
      
      const perm = await Geolocation.checkPermissions();
      console.log(`[GPS_FORENSIC] PLUGIN_CALL_SUCCESS\nplugin=${forensicPlugin}\nmethod=${forensicMethod}\nresult=${JSON.stringify(perm)}`);
      
      if (perm.location !== "granted") {
        forensicMethod = "requestPermissions";
        console.log(`[GPS_FORENSIC] BEFORE_PLUGIN_CALL\nplugin=${forensicPlugin}\nmethod=${forensicMethod}\nisNative=${isNativeApp}\ntimestamp=${new Date().toISOString()}`);
        
        const req = await Geolocation.requestPermissions();
        console.log(`[GPS_FORENSIC] PLUGIN_CALL_SUCCESS\nplugin=${forensicPlugin}\nmethod=${forensicMethod}\nresult=${JSON.stringify(req)}`);
        
        if (req.location !== "granted") {
          console.warn("[GPS-MANAGER] Location permission denied");
          this.setState({ permission: "denied", status: "error", errorMessage: "Native Location Permission Denied" });
          // Retry later if permission denied
          setTimeout(() => {
            if (this.consumers.size > 0) this.startTracking();
          }, 10000);
          return;
        }
      }
      
      this.setState({ permission: "granted" });
      
      forensicPlugin = "NativeGps";
      forensicMethod = "startTracking";
      console.log(`[GPS_FORENSIC] BEFORE_PLUGIN_CALL\nplugin=${forensicPlugin}\nmethod=${forensicMethod}\nisNative=${isNativeApp}\ntimestamp=${new Date().toISOString()}`);

      let sessionToken = undefined;
      if (this.activeJobId && this.activeJobId !== "unknown") {
        console.log(`[GPS_TOKEN_FORENSIC] start_tracking_fetch_begin ts=${Date.now()} job=${this.activeJobId.slice(0, 8)}`);
        sessionToken = await this.fetchGpsSessionToken(this.activeJobId) || undefined;
        if (sessionToken) {
          this.scheduleTokenRefresh(this.activeJobId, sessionToken);
        }
      }

      await NativeGps!.startTracking({
        jobId: this.activeJobId || "unknown",
        apiUrl: window.location.origin,
        gpsSessionToken: sessionToken,
      });
      console.log(`[GPS_FORENSIC] PLUGIN_CALL_SUCCESS\nplugin=${forensicPlugin}\nmethod=${forensicMethod}\nresult=void`);

      this.setState({ nativeServiceActive: true });
      console.log(`[ENTRY_FORENSIC] native_gps_start_result=success`);

      if (!this.listener) {
        forensicMethod = "addListener";
        console.log(`[GPS_FORENSIC] BEFORE_PLUGIN_CALL\nplugin=${forensicPlugin}\nmethod=${forensicMethod}\nisNative=${isNativeApp}\ntimestamp=${new Date().toISOString()}`);

        this.listener = await NativeGps!.addListener("onLocationUpdate", (data: any) => {
          console.log(`[GPS-MANAGER] location received`);
          this.setState({
            status: "active",
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy ?? null,
            speed: data.speed ?? null,
            battery: data.battery ?? null,
            recordedAt: new Date().toISOString(),
            pingCount: this.state.pingCount + 1,
            consecutiveFailures: 0
          });

          // Dispatch global event for backward compatibility (e.g., DriverReadinessGate)
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("sentralogis:native_gps_update", {
                detail: data,
              }),
            );
          }
        });
        console.log(`[GPS_FORENSIC] PLUGIN_CALL_SUCCESS\nplugin=${forensicPlugin}\nmethod=${forensicMethod}\nresult=listener_attached`);
      }
    } catch (e: any) {
      console.log(`[GPS_FORENSIC] PLUGIN_CALL_EXCEPTION\nplugin=${forensicPlugin}\nmethod=${forensicMethod}\nname=${e?.name}\nmessage=${e?.message}\nstack=${e?.stack}\ntimestamp=${new Date().toISOString()}`);
      
      console.error("[GPS-MANAGER] Error starting tracking. Retrying in 3s...", e);
      console.log(`[ENTRY_FORENSIC] native_gps_start_result=failure`);
      this.setState({ status: "error", errorMessage: e?.message || String(e) });
      setTimeout(() => {
        if (this.consumers.size > 0) this.startTracking();
      }, 3000);
    }
  }

  private async stopTracking() {
    console.log(`[GPS-MANAGER] stop requested`);
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
    try {
      this.activeJobId = null;
      if (NativeGps) {
        await NativeGps.stopTracking();
      }
      if (this.listener) {
        this.listener.remove();
        this.listener = null;
      }
      this.setState({ 
        status: "idle", 
        nativeServiceActive: false,
        latitude: null,
        longitude: null,
        accuracy: null,
        speed: null,
        battery: null,
        recordedAt: null,
        pingCount: 0,
        consecutiveFailures: 0
      });
    } catch (e) {
      console.error("[GPS-MANAGER] Error stopping tracking", e);
    }
  }

  /**
   * Explicitly stop ALL GPS tracking — call when JO completes or driver logs out.
   * This is the ONLY way to stop the native foreground service.
   * Do NOT stop the service via component lifecycle (unregisterConsumer).
   */
  public async stopAllTracking() {
    console.log(`[GPS-MANAGER] stopAllTracking called, clearing ${this.consumers.size} consumers`);
    this.consumers.clear();
    await this.stopTracking();
  }

  // Helper method for legacy check
  public async isGpsEnabled(): Promise<boolean> {
    if (!NativeGps) return false;
    try {
      const res = await NativeGps.isGpsEnabled();
      return res.enabled;
    } catch {
      return false;
    }
  }

  public async openLocationSettings(): Promise<void> {
    if (!NativeGps) return;
    try {
      await NativeGps.openLocationSettings();
    } catch (e) {
      console.warn("[GPS-MANAGER] Failed to open location settings", e);
    }
  }
}

export const NativeGpsManager = new NativeGpsManagerClass();
