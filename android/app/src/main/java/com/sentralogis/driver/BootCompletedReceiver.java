package com.sentralogis.driver;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

public class BootCompletedReceiver extends BroadcastReceiver {
    private static final String PREFS_NAME = "GpsPrefs";
    private static final String PREF_TRACKING_ACTIVE = "trackingActive";
    private static final String PREF_JOB_ID = "jobId";
    private static final String PREF_API_URL = "apiUrl";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean trackingActive = prefs.getBoolean(PREF_TRACKING_ACTIVE, false);

            if (trackingActive) {
                String jobId = prefs.getString(PREF_JOB_ID, "Active Job");
                String apiUrl = prefs.getString(PREF_API_URL, "https://www.sentralogis.com");
                Log.d("SentraLogisGPS", "BOOT_COMPLETED: Restoring GPS tracking for job: " + jobId);

                Intent serviceIntent = new Intent(context, GpsForegroundService.class);
                serviceIntent.setAction(GpsForegroundService.ACTION_START);
                serviceIntent.putExtra(GpsForegroundService.EXTRA_JOB_ID, jobId);
                serviceIntent.putExtra(GpsForegroundService.EXTRA_API_URL, apiUrl);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
            } else {
                Log.d("SentraLogisGPS", "BOOT_COMPLETED: No active tracking session found.");
            }
        }
    }
}
