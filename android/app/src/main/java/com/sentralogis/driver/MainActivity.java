package com.sentralogis.driver;

import com.getcapacitor.BridgeActivity;

import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "DeepLink";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the app-local NativeGps plugin BEFORE the Capacitor bridge
        // is built (super.onCreate -> load()), otherwise calls from JS to
        // "NativeGps" throw: plugin is not implemented on android.
        // Capacitor 8 loads third-party plugins from capacitor.plugins.json
        // (assets); app-local plugins must be registered manually here.
        registerPlugin(GpsPlugin.class);

        super.onCreate(savedInstanceState);

        // Handle deep link when app is launched from cold start
        handleDeepLink(getIntent());
    }

    @Override
    public void onResume() {
        super.onResume();
        // Re-check intent in case activity was reusing a sticky intent
        handleDeepLink(getIntent());
    }

    @Override
    public void onNewIntent(Intent newIntent) {
        super.onNewIntent(newIntent);
        setIntent(newIntent);

        // Handle deep link when app is already running
        handleDeepLink(newIntent);

        // Forward intent to Capacitor bridge for WebView consumption
        if (bridge != null) {
            bridge.onNewIntent(newIntent);
        }
    }

    private void handleDeepLink(Intent intent) {
        if (intent == null) return;
        if (!Intent.ACTION_VIEW.equals(intent.getAction())) return;
        if (intent.getData() == null) return;

        Uri data = intent.getData();
        String url = data.toString();
        Log.d(TAG, "URL received: " + url);

        String scheme = data.getScheme();
        String host = data.getHost();
        String path = data.getPath();
        Log.d(TAG, "Scheme: " + scheme + ", Host: " + host + ", Path: " + path);

        String jobId = null;

        if (path != null) {
            // Format: /job/{jobId}
            if (path.startsWith("/job/")) {
                jobId = path.substring("/job/".length());
            }
            // Format: /jo/{token} — token bisa berupa job_id
            else if (path.startsWith("/jo/")) {
                jobId = path.substring("/jo/".length());
            }
        }

        if (jobId != null && !jobId.isEmpty()) {
            // Bersihkan trailing slash jika ada
            if (jobId.endsWith("/")) {
                jobId = jobId.substring(0, jobId.length() - 1);
            }
            Log.d(TAG, "Job ID / Token: " + jobId);

            // Simpan di extra intent agar bisa diakses WebView via Capacitor
            intent.putExtra("job_id", jobId);
        }
    }
}
