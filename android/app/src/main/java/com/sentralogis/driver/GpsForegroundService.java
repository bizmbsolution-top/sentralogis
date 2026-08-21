package com.sentralogis.driver;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.IntentFilter;
import android.content.pm.ServiceInfo;

import android.location.Location;
import android.os.BatteryManager;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;
import android.text.TextUtils;
import android.util.Log;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Network;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.io.InputStream;

public class GpsForegroundService extends Service  {
    private static final String CHANNEL_ID = "GpsForegroundServiceChannel";
    public static final String ACTION_START = "ACTION_START";
    public static final String ACTION_STOP = "ACTION_STOP";
    public static final String ACTION_HEARTBEAT = "ACTION_HEARTBEAT";
    public static final String ACTION_UPDATE_TOKEN = "ACTION_UPDATE_TOKEN";
    public static final String EXTRA_JOB_ID = "EXTRA_JOB_ID";
    public static final String EXTRA_API_URL = "EXTRA_API_URL";
    public static final String EXTRA_GPS_SESSION_TOKEN = "EXTRA_GPS_SESSION_TOKEN";

    private static final long HEARTBEAT_INTERVAL_MS = 60_000;    // 1 menit
    private static final long MOTION_TIMEOUT_MS = 120_000;        // 2 menit
    private static final float STILL_SPEED_THRESHOLD = 5.0f;     // < 5 km/h = stationary
    private static final long STILL_PING_INTERVAL_MS = 60_000;   // 60s when stationary

    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private String currentJobId = "";
    private String currentApiUrl = "";
    private String gpsSessionToken = "";
    private boolean isAuthValid = false;

    private boolean isTokenExpired(String token) {
        if (token == null || token.isEmpty()) {
            Log.d("SentraLogisGPS", "[GPS_AUTH] token_present=false auth_state=MISSING");
            return true;
        }
        try {
            String[] parts = token.split("\\.");
            if (parts.length < 2) {
                Log.d("SentraLogisGPS", "[GPS_AUTH] token_present=true auth_state=INVALID_FORMAT");
                return true;
            }
            String payload = new String(android.util.Base64.decode(parts[1], android.util.Base64.URL_SAFE), "UTF-8");
            org.json.JSONObject json = new org.json.JSONObject(payload);
            long exp = json.optLong("exp", 0);
            long iat = json.optLong("iat", 0);
            long now = System.currentTimeMillis() / 1000;
            long tokenAge = now - iat;
            long remaining = exp - now;
            boolean expired = remaining < 30; // 30 seconds margin
            Log.d("SentraLogisGPS", "[GPS_AUTH] token_present=true token_expiry=" + exp + " token_age=" + tokenAge + "s remaining=" + remaining + "s auth_state=" + (expired ? "EXPIRED" : "VALID"));
            return expired;
        } catch (Exception e) {
            Log.d("SentraLogisGPS", "[GPS_AUTH] token_present=true auth_state=PARSE_ERROR");
            return true;
        }
    }

    private OfflineGpsDbHelper dbHelper;
    private ExecutorService executorService = Executors.newSingleThreadExecutor();
    private ExecutorService offlineSyncExecutor = Executors.newSingleThreadExecutor();
    
    private static final String PREFS_NAME = "GpsPrefs";
    private static final String PREF_JOB_ID = "jobId";
    private static final String PREF_API_URL = "apiUrl";
    private static final String PREF_TRACKING_ACTIVE = "trackingActive";
    private static final String PREF_GPS_SESSION_TOKEN = "gpsSessionToken";
    private PowerManager.WakeLock wakeLock;

    /**
     * Acquire a partial wake lock to keep CPU running while tracking.
     * Guarded against null and double‑acquire.
     */
    private void acquireWakeLock() {
        if (wakeLock == null) {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SentraLogis:GpsWakeLock");
            }
        }
        if (wakeLock != null && !wakeLock.isHeld()) {
            wakeLock.acquire();
            Log.d("SentraLogisGPS", "[WAKELOCK] acquired");
        }
    }

    /**
     * Release the wake lock if held. Guarded against null and double‑release.
     */
    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            Log.d("SentraLogisGPS", "[WAKELOCK] released");
        }
        wakeLock = null;
    }


    // Screen state & motion
    
    // [Phase 3.1] Still-detection: throttle pings when stationary
    private long lastPingTime = 0;
    private double lastPingLat = 0;
    private double lastPingLng = 0;

    // Sensors
    
    // Static listener for Capacitor bridging
    public static LocationUpdateListener listener;
    private ConnectivityManager.NetworkCallback networkCallback;

    public interface LocationUpdateListener {
        void onLocationUpdate(JSONObject locationData);
    }

    
    @Override
    public void onCreate() {
        super.onCreate();
        android.util.Log.d("SentraLogisGPS", "[GPS-JAVA-TRACE] Service onCreate");
        dbHelper = new OfflineGpsDbHelper(this);
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);

        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            networkCallback = new ConnectivityManager.NetworkCallback() {
                @Override
                public void onAvailable(Network network) {
                    Log.d("SentraLogisGPS", "[GPS_NETWORK] Network restored, triggering immediate offline sync");
                    syncOfflineRecords();
                }
            };
            try {
                cm.registerDefaultNetworkCallback(networkCallback);
            } catch (Exception e) {
                Log.w("SentraLogisGPS", "Failed to register network callback", e);
            }
        }

        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult locationResult) {
                if (locationResult == null) return;
                android.util.Log.d("SentraLogisGPS", "[GPS-JAVA-TRACE] location callback received");
                for (Location location : locationResult.getLocations()) {
                    broadcastLocation(location);
                }
            }
        };
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        
        if (networkCallback != null) {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm != null) {
                try { cm.unregisterNetworkCallback(networkCallback); } catch (Exception ignored) {}
            }
        }

        cancelHeartbeat();
        releaseWakeLock();
        executorService.shutdown();
        offlineSyncExecutor.shutdown();
    }

    // ===== BROADCAST LOCATION =====

    private void broadcastLocation(Location location) {
        try {
            JSONObject data = new JSONObject();
            data.put("latitude", location.getLatitude());
            data.put("longitude", location.getLongitude());
            data.put("accuracy", location.getAccuracy());
            data.put("speed", location.getSpeed());
            data.put("heading", location.getBearing());

            BatteryManager bm = (BatteryManager) getSystemService(BATTERY_SERVICE);
            int batLevel = bm != null ? bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) : -1;
            data.put("battery", batLevel);
            data.put("jobId", currentJobId);

            if (listener != null) {
                listener.onLocationUpdate(data);
            }

            // [Phase 3.1] Still-detection: skip API ping if stationary and last ping < 60s ago
            float speedKmh = location.getSpeed() * 3.6f; // m/s → km/h
            long now = System.currentTimeMillis();
            if (speedKmh < STILL_SPEED_THRESHOLD && lastPingTime > 0 && (now - lastPingTime) < STILL_PING_INTERVAL_MS) {
                Log.d("SentraLogisGPS", "Stationary (" + String.format("%.1f", speedKmh) + " km/h), skipping API ping (" + ((now - lastPingTime) / 1000) + "s since last)");
                return;
            }

            queueGpsPing(location, batLevel);
        } catch (Exception e) {
            Log.e("SentraLogisGPS", "Error broadcasting location", e);
        }
    }

    // ===== NETWORK =====

    private boolean isNetworkConnected() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm != null) {
            NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
            return activeNetwork != null && activeNetwork.isConnectedOrConnecting();
        }
        return false;
    }

    // ===== PING API =====

    private void queueGpsPing(Location location, int battery) {
        if (currentJobId == null || currentJobId.equals("unknown")) return;
        executorService.execute(() -> {
            try {
                String clientPingId = UUID.randomUUID().toString();
                dbHelper.insertLocation(clientPingId, currentJobId, location.getLatitude(), location.getLongitude(),
                        location.getAccuracy(), location.getSpeed(), battery, location.getTime());
                Log.d("SentraLogisGPS", "[QUEUE-FIRST] Queued GPS ping: " + clientPingId);
                lastPingTime = System.currentTimeMillis();

                if (isNetworkConnected()) {
                    syncOfflineRecords();
                }
            } catch (Exception e) {
                Log.e("SentraLogisGPS", "Error queuing GPS ping", e);
            }
        });
    }

    private void syncOfflineRecords() {
        if (!isAuthValid) {
            Log.d("SentraLogisGPS", "[GPS_AUTH] sync paused awaiting fresh token");
            return;
        }
        offlineSyncExecutor.execute(() -> {
            int maxBatches = 50;
            int batchIteration = 0;
            while (isAuthValid && isNetworkConnected() && batchIteration < maxBatches) {
                batchIteration++;
                try {
                    // Cleanup synced records
                    dbHelper.deleteSyncedLocations();

                    List<OfflineGpsDbHelper.OfflineLocation> pendingList = dbHelper.getPendingLocations(50);
                    if (pendingList.isEmpty()) {
                        break;
                    }
                    
                    Log.d("SentraLogisGPS", "[GPS_SYNC_FORENSIC] queue_count: " + dbHelper.getTotalLocationsCount() + ", batch_size: " + pendingList.size());
                    Log.d("SentraLogisGPS", "[SYNC_ENGINE] Batch started. " + pendingList.size() + " PENDING records (iteration " + batchIteration + ").");
                    
                    List<String> pingIds = new java.util.ArrayList<>();
                    JSONArray pingsArray = new JSONArray();
                    for (OfflineGpsDbHelper.OfflineLocation loc : pendingList) {
                        pingIds.add(loc.clientPingId);
                        JSONObject offPayload = new JSONObject();
                        offPayload.put("client_ping_id", loc.clientPingId);
                        offPayload.put("latitude", loc.lat);
                        offPayload.put("longitude", loc.lng);
                        offPayload.put("recorded_at", Instant.ofEpochMilli(loc.timestamp).toString());
                        offPayload.put("source", "native_android_batch");
                        offPayload.put("battery", loc.battery);
                        offPayload.put("speed", loc.speed);
                        offPayload.put("accuracy", loc.accuracy);
                        pingsArray.put(offPayload);
                    }
                    
                    dbHelper.updateStatus(pingIds, "SYNCING");

                    JSONObject batchPayload = new JSONObject();
                    batchPayload.put("action", "gps_ping_batch");
                    batchPayload.put("job_order_id", currentJobId);
                    batchPayload.put("pings", pingsArray);
                    batchPayload.put("internet_connected", isNetworkConnected());
                    batchPayload.put("background_running", true);

                    long requestStart = System.currentTimeMillis();
                    int pendingBefore = dbHelper.getTotalLocationsCount();

                    String response = performHttpRequestWithResponse(batchPayload.toString());
                    long requestFinish = System.currentTimeMillis();
                    long durationMs = requestFinish - requestStart;

                    if (response != null) {
                        JSONObject respJson = new JSONObject(response);
                        if (respJson.optBoolean("success", false)) {
                            JSONObject ackObj = respJson.optJSONObject("ack");
                            List<String> ackedIds = new java.util.ArrayList<>();
                            
                            if (ackObj != null) {
                                JSONArray acceptedArr = ackObj.optJSONArray("accepted");
                                if (acceptedArr != null) {
                                    for (int i = 0; i < acceptedArr.length(); i++) ackedIds.add(acceptedArr.getString(i));
                                }
                                JSONArray duplicatesArr = ackObj.optJSONArray("duplicates");
                                if (duplicatesArr != null) {
                                    for (int i = 0; i < duplicatesArr.length(); i++) ackedIds.add(duplicatesArr.getString(i));
                                }
                            }

                            if (!ackedIds.isEmpty()) {
                                dbHelper.updateStatus(ackedIds, "SYNCED");
                                dbHelper.deleteSyncedLocations();
                            }
                            
                            int pendingAfter = dbHelper.getTotalLocationsCount();
                            Log.d("SentraLogisGPS", "[GPS_SYNC] batch_count=" + pingsArray.length() + " pending_before=" + pendingBefore + " pending_after=" + pendingAfter + " duration_ms=" + durationMs);

                            // Revert any syncing records that were NOT explicitly ACKED back to PENDING
                            dbHelper.resetSyncingToPending();
                            
                            // If this batch had fewer than 50, we're done
                            if (pendingList.size() < 50) {
                                break;
                            }
                        } else {
                            dbHelper.resetSyncingToPending();
                            break;
                        }
                    } else {
                        dbHelper.resetSyncingToPending();
                        break;
                    }
                } catch (Exception e) {
                    Log.e("SentraLogisGPS", "Error in syncOfflineRecords", e);
                    dbHelper.resetSyncingToPending();
                    break;
                }
            }
        });
    }

    private String performHttpRequestWithResponse(String jsonPayload) {
        try {
            URL url = new URL(currentApiUrl + "/api/jo/" + currentJobId);
            Log.d("SentraLogisGPS", "[GPS Native HTTP] URL=" + url.toString());
            
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("X-HTTP-Method-Override", "PATCH");
            conn.setRequestProperty("Content-Type", "application/json");
            if (gpsSessionToken != null && !gpsSessionToken.isEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer " + gpsSessionToken);
            }
            conn.setDoOutput(true);
            conn.setConnectTimeout(15000); // 15s to match vercel
            conn.setReadTimeout(15000);

            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = jsonPayload.getBytes("utf-8");
                os.write(input, 0, input.length);
            }

            int code = conn.getResponseCode();
            
            InputStream is = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();
            if (is != null) {
                java.util.Scanner s = new java.util.Scanner(is).useDelimiter("\\A");
                String response = s.hasNext() ? s.next() : "";
                conn.disconnect();
                return response;
            }

            conn.disconnect();
            return null;
        } catch (Exception e) {
            Log.e("SentraLogisGPS", "[GPS Native HTTP] FAILURE=" + e.getMessage(), e);
            return null;
        }
    }

    // ===== SERVICE LIFECYCLE =====

        @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        android.util.Log.d("SentraLogisGPS", "[GPS-JAVA-TRACE] Service onStartCommand");
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        
        if (intent != null) {
            String action = intent.getAction();
            
            if (ACTION_START.equals(action)) {
                currentJobId = intent.getStringExtra(EXTRA_JOB_ID);
                if (currentJobId == null) currentJobId = "Active Job";
                currentApiUrl = intent.getStringExtra(EXTRA_API_URL);
                if (currentApiUrl == null) currentApiUrl = "https://www.sentralogis.com";
                String tokenExtra = intent.getStringExtra(EXTRA_GPS_SESSION_TOKEN);
                if (tokenExtra != null) {
                    gpsSessionToken = tokenExtra;
                    isAuthValid = !isTokenExpired(gpsSessionToken);
                }

                // Persist state
                prefs.edit()
                    .putString(PREF_JOB_ID, currentJobId)
                    .putString(PREF_API_URL, currentApiUrl)
                    .putString(PREF_GPS_SESSION_TOKEN, gpsSessionToken)
                    .putBoolean(PREF_TRACKING_ACTIVE, true)
                    .apply();

                createNotificationChannel();
                startForegroundNotification();
                // Acquire partial wake lock for CPU while tracking
                acquireWakeLock();
                
                // App startup recovery
                executorService.execute(() -> {
                    dbHelper.resetSyncingToPending();
                    Log.d("SentraLogisGPS", "[SYNC_ENGINE] App startup recovery: SYNCING reverted to PENDING.");
                });

                startLocationUpdates();
                scheduleHeartbeat();
                Log.d("SentraLogisGPS", "SERVICE_STARTED: jobId=" + currentJobId);

            } else if (ACTION_STOP.equals(action)) {
                Log.d("SentraLogisGPS", "SERVICE_STOPPED");
                gpsSessionToken = "";
                isAuthValid = false;
                prefs.edit()
                    .remove(PREF_GPS_SESSION_TOKEN)
                    .putBoolean(PREF_TRACKING_ACTIVE, false)
                    .apply();
                cancelHeartbeat();
                stopLocationUpdates();
                stopForeground(true);
                releaseWakeLock();
                stopSelf();

            } else if (ACTION_UPDATE_TOKEN.equals(action)) {
                String tokenExtra = intent.getStringExtra(EXTRA_GPS_SESSION_TOKEN);
                if (tokenExtra != null) {
                    gpsSessionToken = tokenExtra;
                    isAuthValid = !isTokenExpired(gpsSessionToken);
                    prefs.edit().putString(PREF_GPS_SESSION_TOKEN, gpsSessionToken).apply();
                    Log.d("SentraLogisGPS", "[GPS_AUTH] fresh token received, authValid=" + isAuthValid);
                    if (isAuthValid) {
                        Log.d("SentraLogisGPS", "[GPS_AUTH] sync resumed");
                        syncOfflineRecords();
                    }
                }
            } else if (ACTION_HEARTBEAT.equals(action)) {
                if (isTokenExpired(gpsSessionToken)) {
                    isAuthValid = false;
                }
                syncOfflineRecords();
                scheduleHeartbeat();
            }
        } else {
            // Null intent -> Process recreation recovery
            boolean trackingActive = prefs.getBoolean(PREF_TRACKING_ACTIVE, false);
            if (trackingActive) {
                currentJobId = prefs.getString(PREF_JOB_ID, "Active Job");
                currentApiUrl = prefs.getString(PREF_API_URL, "https://www.sentralogis.com");
                gpsSessionToken = prefs.getString(PREF_GPS_SESSION_TOKEN, "");
                isAuthValid = !isTokenExpired(gpsSessionToken);
                
                if (!isAuthValid) {
                    Log.d("SentraLogisGPS", "[GPS_AUTH] token near expiry / refresh required on restart");
                }
                
                Log.d("SentraLogisGPS", "SERVICE_RESTARTED (Null Intent), STATE_RECOVERED: jobId=" + currentJobId);
                
                createNotificationChannel();
                startForegroundNotification();
                
                // App startup recovery
                executorService.execute(() -> {
                    dbHelper.resetSyncingToPending();
                    Log.d("SentraLogisGPS", "[SYNC_ENGINE] App startup recovery: SYNCING reverted to PENDING.");
                });

                startLocationUpdates();
                scheduleHeartbeat();
            } else {
                Log.d("SentraLogisGPS", "GPS_SERVICE_NO_STATE (Null Intent but tracking inactive), stopping.");
                stopSelf();
            }
        }
        return START_STICKY;
    }

    // ===== FOREGROUND NOTIFICATION =====

    private void startForegroundNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this,
                0, notificationIntent, PendingIntent.FLAG_IMMUTABLE);

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("SentraLogis GPS Tracking")
                .setContentText("Job: " + currentJobId + " - GPS aktif")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            try {
            startForeground(101, notification);
            android.util.Log.d("SentraLogisGPS", "[GPS-JAVA-TRACE] startForeground SUCCESS");
        } catch (Exception e) {
            android.util.Log.e("SentraLogisGPS", "[GPS-JAVA-TRACE] startForeground FAILED: " + e.getMessage(), e);
        }
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "SentraLogis GPS",
                    NotificationManager.IMPORTANCE_HIGH
            );
            serviceChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            serviceChannel.setShowBadge(true);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }

    // ===== LOCATION UPDATES =====

        private void startLocationUpdates() {
        android.util.Log.d("SentraLogisGPS", "[GPS-JAVA-TRACE] location request created");
        LocationRequest locationRequest = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 30_000)
                .setMinUpdateIntervalMillis(10_000)
                .setMaxUpdateDelayMillis(60_000)
                .build();
        try {
            fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper());
            android.util.Log.d("SentraLogisGPS", "[GPS-JAVA-TRACE] requestLocationUpdates SUCCESS");
        } catch (SecurityException e) {
            android.util.Log.e("SentraLogisGPS", "[GPS-JAVA-TRACE] requestLocationUpdates FAILED: SecurityException", e);
        } catch (Exception e) {
            android.util.Log.e("SentraLogisGPS", "[GPS-JAVA-TRACE] requestLocationUpdates FAILED: " + e.getMessage(), e);
        }
    }

    private void restartLocationUpdates() {
        stopLocationUpdates();
        startLocationUpdates();
    }

    private void stopLocationUpdates() {
        try {
            fusedLocationClient.removeLocationUpdates(locationCallback);
        } catch (Exception ignored) {}
    }

    // ===== ACCELEROMETER (Motion Detection) =====

    

    

    
    // ===== ALARM MANAGER HEARTBEAT =====

    private void scheduleHeartbeat() {
        AlarmManager alarmManager = (AlarmManager) getSystemService(ALARM_SERVICE);
        Intent heartbeatIntent = new Intent(this, GpsForegroundService.class);
        heartbeatIntent.setAction(ACTION_HEARTBEAT);
        PendingIntent pendingIntent = PendingIntent.getService(this,
                0, heartbeatIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        if (alarmManager != null) {
            alarmManager.set(AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    SystemClock.elapsedRealtime() + HEARTBEAT_INTERVAL_MS,
                    pendingIntent);
        }
    }

    private void cancelHeartbeat() {
        AlarmManager alarmManager = (AlarmManager) getSystemService(ALARM_SERVICE);
        Intent heartbeatIntent = new Intent(this, GpsForegroundService.class);
        heartbeatIntent.setAction(ACTION_HEARTBEAT);
        PendingIntent pendingIntent = PendingIntent.getService(this,
                0, heartbeatIntent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        if (alarmManager != null) {
            alarmManager.cancel(pendingIntent);
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
