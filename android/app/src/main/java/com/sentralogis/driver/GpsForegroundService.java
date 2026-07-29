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
import android.content.IntentFilter;
import android.content.pm.ServiceInfo;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.Location;
import android.os.BatteryManager;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
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
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class GpsForegroundService extends Service implements SensorEventListener {
    private static final String CHANNEL_ID = "GpsForegroundServiceChannel";
    public static final String ACTION_START = "ACTION_START";
    public static final String ACTION_STOP = "ACTION_STOP";
    public static final String ACTION_HEARTBEAT = "ACTION_HEARTBEAT";
    public static final String EXTRA_JOB_ID = "EXTRA_JOB_ID";
    public static final String EXTRA_API_URL = "EXTRA_API_URL";

    private static final long HEARTBEAT_INTERVAL_MS = 300_000;    // 5 menit
    private static final long MOTION_TIMEOUT_MS = 120_000;        // 2 menit

    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private String currentJobId = "";
    private String currentApiUrl = "";

    private OfflineGpsDbHelper dbHelper;
    private ExecutorService executorService = Executors.newSingleThreadExecutor();

    // Screen state & motion
    private boolean isScreenOff = false;
    private boolean highAccuracyForced = false;
    private long lastMotionTime = 0;

    // Sensors
    private SensorManager sensorManager;
    private Sensor accelerometer;

    // Static listener for Capacitor bridging
    public static LocationUpdateListener listener;

    public interface LocationUpdateListener {
        void onLocationUpdate(JSONObject locationData);
    }

    // BroadcastReceiver untuk screen on/off
    private final BroadcastReceiver screenStateReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (Intent.ACTION_SCREEN_OFF.equals(action)) {
                Log.d("GpsService", "Screen OFF -> balanced power");
                isScreenOff = true;
                restartLocationUpdates();
            } else if (Intent.ACTION_SCREEN_ON.equals(action)) {
                Log.d("GpsService", "Screen ON -> high accuracy");
                isScreenOff = false;
                highAccuracyForced = false;
                restartLocationUpdates();
            }
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        dbHelper = new OfflineGpsDbHelper(this);
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);

        sensorManager = (SensorManager) getSystemService(SENSOR_SERVICE);
        if (sensorManager != null) {
            accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        }

        IntentFilter screenFilter = new IntentFilter();
        screenFilter.addAction(Intent.ACTION_SCREEN_ON);
        screenFilter.addAction(Intent.ACTION_SCREEN_OFF);
        registerReceiver(screenStateReceiver, screenFilter);

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
        try { unregisterReceiver(screenStateReceiver); } catch (Exception ignored) {}
        stopAccelerometer();
        cancelHeartbeat();
        executorService.shutdown();
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

            sendPingToApi(location, batLevel);
        } catch (Exception e) {
            Log.e("GpsService", "Error broadcasting location", e);
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
                payload.put("source", "native_android");
                payload.put("battery", battery);
                payload.put("speed", location.getSpeed());
                payload.put("accuracy", location.getAccuracy());
                payload.put("internet_connected", isNetworkConnected());
                payload.put("background_running", !isScreenOff);
                payload.put("screen_off", isScreenOff);

                boolean success = performHttpRequest(payload.toString());

                if (!success) {
                    dbHelper.insertLocation(currentJobId, location.getLatitude(), location.getLongitude(),
                            location.getAccuracy(), location.getSpeed(), battery);
                } else {
                    List<OfflineGpsDbHelper.OfflineLocation> offlineList = dbHelper.getAllLocations();
                    for (OfflineGpsDbHelper.OfflineLocation loc : offlineList) {
                        JSONObject offPayload = new JSONObject();
                        offPayload.put("action", "gps_ping");
                        offPayload.put("lat", loc.lat);
                        offPayload.put("lng", loc.lng);
                        offPayload.put("source", "native_android_offline");
                        offPayload.put("battery", loc.battery);
                        offPayload.put("speed", loc.speed);
                        offPayload.put("accuracy", loc.accuracy);

                        boolean offSuccess = performHttpRequest(offPayload.toString());
                        if (offSuccess) {
                            dbHelper.deleteLocation(loc.id);
                        } else {
                            break;
                        }
                    }
                }
            } catch (Exception e) {
                Log.e("GpsService", "Error in sendPingToApi", e);
            }
        });
    }

    private boolean performHttpRequest(String jsonPayload) {
        try {
            URL url = new URL(currentApiUrl + "/api/jo/" + currentJobId);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("PATCH");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = jsonPayload.getBytes("utf-8");
                os.write(input, 0, input.length);
            }

            int code = conn.getResponseCode();
            conn.disconnect();
            return code >= 200 && code < 300;
        } catch (Exception e) {
            return false;
        }
    }

    // ===== SERVICE LIFECYCLE =====

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();

            if (ACTION_START.equals(action)) {
                currentJobId = intent.getStringExtra(EXTRA_JOB_ID);
                if (currentJobId == null) currentJobId = "Active Job";
                currentApiUrl = intent.getStringExtra(EXTRA_API_URL);
                if (currentApiUrl == null) currentApiUrl = "https://www.sentralogis.com";

                createNotificationChannel();
                startForegroundNotification();
                startLocationUpdates();
                startAccelerometer();
                scheduleHeartbeat();
                Log.d("GpsService", "Started: jobId=" + currentJobId);

            } else if (ACTION_STOP.equals(action)) {
                Log.d("GpsService", "Stopping service");
                stopAccelerometer();
                cancelHeartbeat();
                stopLocationUpdates();
                stopForeground(true);
                stopSelf();

            } else if (ACTION_HEARTBEAT.equals(action)) {
                checkMotionTimeout();
                scheduleHeartbeat();
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
            LocationRequest locationRequest;
            if (isScreenOff && !highAccuracyForced) {
                Log.d("GpsService", "Using BALANCED_POWER (screen off, no motion)");
                locationRequest = new LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, 30000)
                        .setMinUpdateIntervalMillis(20000)
                        .build();
            } else {
                Log.d("GpsService", "Using HIGH_ACCURACY");
                locationRequest = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 15000)
                        .setMinUpdateIntervalMillis(10000)
                        .build();
            }
            fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper());
        } catch (SecurityException e) {
            Log.e("GpsService", "Missing location permissions", e);
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

    private void startAccelerometer() {
        if (accelerometer != null && sensorManager != null) {
            sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_NORMAL);
        }
    }

    private void stopAccelerometer() {
        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() == Sensor.TYPE_ACCELEROMETER) {
            float x = event.values[0];
            float y = event.values[1];
            float z = event.values[2];
            double magnitude = Math.sqrt(x * x + y * y + z * z);
            // Gravity is ~9.8 m/s^2; if magnitude deviates significantly, driver is moving
            if (magnitude > 11.0 || magnitude < 8.0) {
                lastMotionTime = SystemClock.elapsedRealtime();
                if (!highAccuracyForced && isScreenOff) {
                    Log.d("GpsService", "Motion detected while screen off -> force HIGH_ACCURACY");
                    highAccuracyForced = true;
                    restartLocationUpdates();
                }
            }
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

    private void checkMotionTimeout() {
        if (highAccuracyForced && isScreenOff) {
            long elapsed = SystemClock.elapsedRealtime() - lastMotionTime;
            if (elapsed > MOTION_TIMEOUT_MS) {
                Log.d("GpsService", "No motion for 2 min -> back to BALANCED");
                highAccuracyForced = false;
                restartLocationUpdates();
            }
        }
    }

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
