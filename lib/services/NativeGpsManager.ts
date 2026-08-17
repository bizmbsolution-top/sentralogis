import { registerPlugin, Capacitor } from "@capacitor/core";

interface NativeGpsPlugin {
  startTracking(options: { jobId: string; apiUrl: string }): Promise<void>;
  stopTracking(): Promise<void>;
  addListener(eventName: "onLocationUpdate", listenerFunc: (data: any) => void): Promise<any>;
  isGpsEnabled(): Promise<{ enabled: boolean }>;
  openLocationSettings(): Promise<void>;
  speakText?(options: { text: string; lang: string }): Promise<void>;
}

const NativeGps = typeof window !== "undefined" ? registerPlugin<NativeGpsPlugin>("NativeGps") : null;

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

      await NativeGps!.startTracking({
        jobId: this.activeJobId || "unknown",
        apiUrl: window.location.origin,
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
