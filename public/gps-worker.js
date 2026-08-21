// GPS Web Worker — background GPS ping for PWA drivers
// Runs in separate thread, survives tab visibility changes

let intervalId = null;
let token = null;
let apiUrl = null;
const PING_INTERVAL_MS = 60_000; // 1 minute

self.onmessage = function (e) {
  const { type, payload } = e.data;

  switch (type) {
    case "START":
      token = payload.token;
      apiUrl = payload.apiUrl || self.location.origin;
      console.log("[GPS Worker] Starting for JO:", token);
      startPinging();
      break;

    case "STOP":
      console.log("[GPS Worker] Stopping");
      stopPinging();
      break;

    case "PING_NOW":
      doPing();
      break;
  }
};

function startPinging() {
  if (intervalId) clearInterval(intervalId);
  doPing(); // immediate first ping
  intervalId = setInterval(doPing, PING_INTERVAL_MS);
}

function stopPinging() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function doPing() {
  if (!token) return;

  if (!navigator.geolocation) {
    console.warn("[GPS Worker] Geolocation not available");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const payload = {
        action: "gps_ping",
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        recorded_at: new Date().toISOString(),
        source: "pwa",
        speed: pos.coords.speed || undefined,
        accuracy: pos.coords.accuracy || undefined,
      };

      try {
        let gpsSessionToken = "";
        try {
          const tokenRes = await fetch(`${apiUrl}/api/jo/${token}/gps-session`, { method: "POST" });
          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            gpsSessionToken = tokenData.gps_session_token || "";
          }
        } catch (e) {
          console.warn("[gps-worker] Failed to fetch session token", e);
        }

        const headers = {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        };
        if (gpsSessionToken) {
          headers["Authorization"] = `Bearer ${gpsSessionToken}`;
        }

        const res = await fetch(`${apiUrl}/api/jo/${token}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const result = await res.json();
          self.postMessage({
            type: "PING_SUCCESS",
            payload: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              speed: pos.coords.speed,
              geofence_triggered: result.geofence_triggered || false,
              arrived_stop: result.arrived_stop || null,
            },
          });
        } else {
          console.warn("[GPS Worker] Ping failed:", res.status);
          self.postMessage({ type: "PING_FAILED", payload: { status: res.status } });
        }
      } catch (err) {
        console.warn("[GPS Worker] Network error:", err.message);
        self.postMessage({ type: "PING_FAILED", payload: { error: err.message } });
      }
    },
    (err) => {
      console.warn("[GPS Worker] Geolocation error:", err.message);
      self.postMessage({ type: "GEOLOCATION_ERROR", payload: { error: err.message } });
    },
    {
      enableHighAccuracy: true,
      timeout: 25_000,
      maximumAge: 30_000,
    }
  );
}
