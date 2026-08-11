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
    callback(this.state);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public getState(): NativeGpsState {
    return this.state;
  }

  public async registerConsumer(consumerId: string, jobId: string) {
    if (typeof window === "undefined" || !Capacitor.isNativePlatform()) return;
    if (!NativeGps) return;
    
    this.consumers.add(consumerId);
    this.activeJobId = jobId;
    
    console.log(`[GPS-MANAGER] register consumer: ${consumerId}`);
    console.log(`[GPS-MANAGER] consumer count: ${this.consumers.size}`);
    
    if (this.consumers.size === 1) {
      this.setState({ status: "loading" });
      await this.startTracking();
    } else {
      // Already running, just broadcast current state
      console.log(`[GPS-MANAGER] service active: true, attaching new consumer ${consumerId}`);
      this.notifySubscribers();
    }
  }

  public async unregisterConsumer(consumerId: string) {
    if (typeof window === "undefined" || !Capacitor.isNativePlatform()) return;
    
    const existed = this.consumers.delete(consumerId);
    if (!existed) return;

    console.log(`[GPS-MANAGER] unregister consumer: ${consumerId}`);
    console.log(`[GPS-MANAGER] consumer count: ${this.consumers.size}`);

    if (this.consumers.size === 0) {
      await this.stopTracking();
    }
  }

  private async startTracking() {
    console.log(`[GPS-MANAGER] start requested: ${this.activeJobId}`);
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const perm = await Geolocation.checkPermissions();
      
      if (perm.location !== "granted") {
        const req = await Geolocation.requestPermissions();
        if (req.location !== "granted") {
          console.warn("[GPS-MANAGER] Location permission denied");
          this.setState({ permission: "denied", status: "error" });
          // Retry later if permission denied
          setTimeout(() => {
            if (this.consumers.size > 0) this.startTracking();
          }, 10000);
          return;
        }
      }
      
      this.setState({ permission: "granted" });
      
      await NativeGps!.startTracking({
        jobId: this.activeJobId || "unknown",
        apiUrl: window.location.origin,
      });

      this.setState({ nativeServiceActive: true });

      if (!this.listener) {
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
      }
    } catch (e) {
      console.error("[GPS-MANAGER] Error starting tracking. Retrying in 3s...", e);
      this.setState({ status: "error" });
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
}

export const NativeGpsManager = new NativeGpsManagerClass();
