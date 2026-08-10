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
import android.util.Log;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.io.InputStream;

public class GpsForegroundService extends Service  {
    private static final String CHANNEL_ID = "GpsForegroundServiceChannel";
    public static final String ACTION_START = "ACTION_START";
    public static final String ACTION_STOP = "ACTION_STOP";
    public static final String ACTION_HEARTBEAT = "ACTION_HEARTBEAT";
    public static final String EXTRA_JOB_ID = "EXTRA_JOB_ID";
    public static final String EXTRA_API_URL = "EXTRA_API_URL";

    private static final long HEARTBEAT_INTERVAL_MS = 60_000;    // 1 menit
    private static final long MOTION_TIMEOUT_MS = 120_000;        // 2 menit
    private static final float STILL_SPEED_THRESHOLD = 5.0f;     // < 5 km/h = stationary
    private static final long STILL_PING_INTERVAL_MS = 60_000;   // 60s when stationary

    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private String currentJobId = "";
    private String currentApiUrl = "";

    private OfflineGpsDbHelper dbHelper;
    private ExecutorService executorService = Executors.newSingleThreadExecutor();
    private ExecutorService offlineSyncExecutor = Executors.newSingleThreadExecutor();
    
    private static final String PREFS_NAME = "GpsPrefs";
    private static final String PREF_JOB_ID = "jobId";
    private static final String PREF_API_URL = "apiUrl";
    private static final String PREF_TRACKING_ACTIVE = "trackingActive";
    private PowerManager.WakeLock wakeLock;

    // Screen state & motion
    
    // [Phase 3.1] Still-detection: throttle pings when stationary
    private long lastPingTime = 0;
    private double lastPingLat = 0;
    private double lastPingLng = 0;

    // Sensors
    
    // Static listener for Capacitor bridging
    public static LocationUpdateListener listener;

    public interface LocationUpdateListener {
        void onLocationUpdate(JSONObject locationData);
    }

    
    @Override
    public void onCreate() {
        super.onCreate();
        dbHelper = new OfflineGpsDbHelper(this);
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);

        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult locationResult) {
                if (locationResult == null) return;
                for (Location location : locationResult.getLocations()) {
                    broadcastLocation(location);
                }
            }
        };
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        
                cancelHeartbeat();
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

            sendPingToApi(location, batLevel);
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

        private void sendPingToApi(Location location, int battery) {
        executorService.execute(() -> {
            try {
                JSONObject payload = new JSONObject();
                payload.put("action", "gps_ping");
                payload.put("lat", location.getLatitude());
                payload.put("lng", location.getLongitude());
                // Use actual GPS acquisition time
                payload.put("recorded_at", Instant.ofEpochMilli(location.getTime()).toString());
                payload.put("source", "native_android");
                payload.put("battery", battery);
                payload.put("speed", location.getSpeed());
                payload.put("accuracy", location.getAccuracy());
                payload.put("internet_connected", isNetworkConnected());
                payload.put("background_running", true);
                
                Log.d("SentraLogisGPS", "LOCATION_RECEIVED: " + location.getLatitude() + "," + location.getLongitude());

                boolean success = performHttpRequest(payload.toString());

                if (!success) {
                    Log.d("SentraLogisGPS", "GPS_HTTP_FAILURE, queuing offline");
                    dbHelper.insertLocation(currentJobId, location.getLatitude(), location.getLongitude(),
                            location.getAccuracy(), location.getSpeed(), battery, location.getTime());
                } else {
                    Log.d("SentraLogisGPS", "GPS_HTTP_SUCCESS");
                    lastPingTime = System.currentTimeMillis();
                    lastPingLat = location.getLatitude();
                    lastPingLng = location.getLongitude();

                    // Trigger offline sync in separate executor
                    syncOfflineRecords();
                }
            } catch (Exception e) {
                Log.e("SentraLogisGPS", "Error in sendPingToApi", e);
            }
        });
    }

    private void syncOfflineRecords() {
        offlineSyncExecutor.execute(() -> {
            try {
                List<OfflineGpsDbHelper.OfflineLocation> offlineList = dbHelper.getAllLocations();
                if (offlineList.isEmpty()) return;
                
                Log.d("SentraLogisGPS", "OFFLINE_SYNC_STARTED: " + offlineList.size() + " records");
                
                // Batch limit
                int batchLimit = 20;
                int synced = 0;
                
                for (OfflineGpsDbHelper.OfflineLocation loc : offlineList) {
                    if (synced >= batchLimit) break;
                    
                    JSONObject offPayload = new JSONObject();
                    offPayload.put("action", "gps_ping");
                    offPayload.put("lat", loc.lat);
                    offPayload.put("lng", loc.lng);
                    offPayload.put("recorded_at", Instant.ofEpochMilli(loc.timestamp).toString());
                    offPayload.put("source", "native_android_offline");
                    offPayload.put("battery", loc.battery);
                    offPayload.put("speed", loc.speed);
                    offPayload.put("accuracy", loc.accuracy);
                    offPayload.put("internet_connected", true);
                    offPayload.put("background_running", true);

                    boolean offSuccess = performHttpRequest(offPayload.toString());
                    if (offSuccess) {
                        dbHelper.deleteLocation(loc.id);
                        synced++;
                    } else {
                        Log.d("SentraLogisGPS", "OFFLINE_SYNC_FAILURE");
                        break; // Stop sync on first failure to respect ordering and network state
                    }
                }
                if (synced > 0) {
                    Log.d("SentraLogisGPS", "OFFLINE_SYNC_SUCCESS: " + synced + " records synced");
                }
            } catch (Exception e) {
                Log.e("SentraLogisGPS", "Error in syncOfflineRecords", e);
            }
        });
    }

    private boolean performHttpRequest(String jsonPayload) {
        try {
            URL url = new URL(currentApiUrl + "/api/jo/" + currentJobId);
            Log.d("SentraLogisGPS", "[GPS Native HTTP] URL=" + url.toString());
            Log.d("SentraLogisGPS", "[GPS Native HTTP] METHOD=PATCH (via POST + X-HTTP-Method-Override)");
            
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            // Android's HttpURLConnection does not support PATCH natively (throws ProtocolException).
            // We use POST with X-HTTP-Method-Override to achieve the same result safely.
            conn.setRequestMethod("POST");
            conn.setRequestProperty("X-HTTP-Method-Override", "PATCH");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            Log.d("SentraLogisGPS", "[GPS Native HTTP] REQUEST_SENT");

            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = jsonPayload.getBytes("utf-8");
                os.write(input, 0, input.length);
            }

            int code = conn.getResponseCode();
            Log.d("SentraLogisGPS", "[GPS Native HTTP] HTTP_STATUS=" + code);
            
            // Read response body for debugging if possible
            try {
                InputStream is = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();
                if (is != null) {
                    java.util.Scanner s = new java.util.Scanner(is).useDelimiter("\\A");
                    String response = s.hasNext() ? s.next() : "";
                    Log.d("SentraLogisGPS", "[GPS Native HTTP] RESPONSE=" + response);
                }
            } catch (Exception ignored) {}

            conn.disconnect();
            return code >= 200 && code < 300;
        } catch (Exception e) {
            Log.e("SentraLogisGPS", "[GPS Native HTTP] FAILURE=" + e.getMessage(), e);
            return false;
        }
    }

    // ===== SERVICE LIFECYCLE =====

        @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        
        if (intent != null) {
            String action = intent.getAction();
            
            if (ACTION_START.equals(action)) {
                currentJobId = intent.getStringExtra(EXTRA_JOB_ID);
                if (currentJobId == null) currentJobId = "Active Job";
                currentApiUrl = intent.getStringExtra(EXTRA_API_URL);
                if (currentApiUrl == null) currentApiUrl = "https://www.sentralogis.com";

                // Persist state
                prefs.edit()
                    .putString(PREF_JOB_ID, currentJobId)
                    .putString(PREF_API_URL, currentApiUrl)
                    .putBoolean(PREF_TRACKING_ACTIVE, true)
                    .apply();

                createNotificationChannel();
                startForegroundNotification();
                startLocationUpdates();
                scheduleHeartbeat();
                Log.d("SentraLogisGPS", "SERVICE_STARTED: jobId=" + currentJobId);

            } else if (ACTION_STOP.equals(action)) {
                Log.d("SentraLogisGPS", "SERVICE_STOPPED");
                prefs.edit().putBoolean(PREF_TRACKING_ACTIVE, false).apply();
                cancelHeartbeat();
                stopLocationUpdates();
                stopForeground(true);
                stopSelf();

            } else if (ACTION_HEARTBEAT.equals(action)) {
                scheduleHeartbeat();
            }
        } else {
            // Null intent -> Process recreation recovery
            boolean trackingActive = prefs.getBoolean(PREF_TRACKING_ACTIVE, false);
            if (trackingActive) {
                currentJobId = prefs.getString(PREF_JOB_ID, "Active Job");
                currentApiUrl = prefs.getString(PREF_API_URL, "https://www.sentralogis.com");
                Log.d("SentraLogisGPS", "SERVICE_RESTARTED (Null Intent), STATE_RECOVERED: jobId=" + currentJobId);
                
                createNotificationChannel();
                startForegroundNotification();
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
            startForeground(1, notification);
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
        try {
            Log.d("SentraLogisGPS", "Starting location updates (HIGH_ACCURACY)");
            LocationRequest locationRequest = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 60000)
                    .setMinUpdateIntervalMillis(60000)
                    .build();
            fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper());
        } catch (SecurityException e) {
            Log.e("SentraLogisGPS", "Missing location permissions", e);
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
