package com.sentralogis.driver;

import android.content.Context;
import android.content.Intent;
import android.location.LocationManager;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import java.util.Locale;
import java.util.HashMap;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeGps")
public class GpsPlugin extends Plugin {

    @Override
    public void load() {
        super.load();
        GpsForegroundService.listener = locationData -> {
            try {
                JSObject ret = new JSObject();
                ret.put("latitude", locationData.getDouble("latitude"));
                ret.put("longitude", locationData.getDouble("longitude"));
                ret.put("accuracy", locationData.getDouble("accuracy"));
                ret.put("speed", locationData.getDouble("speed"));
                ret.put("heading", locationData.getDouble("heading"));
                ret.put("battery", locationData.getInt("battery"));
                ret.put("jobId", locationData.getString("jobId"));
                notifyListeners("onLocationUpdate", ret);
            } catch (Exception e) {
                e.printStackTrace();
            }
        };
    }

    @PluginMethod
    public void startTracking(PluginCall call) {
        try {
            android.util.Log.d("GpsPlugin", "[GPS-JAVA-TRACE] NativeGps.startTracking invoked");
            android.util.Log.d("GpsPlugin", "[GPS-JAVA-TRACE] plugin startTracking entered");
            String jobId = call.getString("jobId", "Active Job");
            String apiUrl = call.getString("apiUrl", "https://www.sentralogis.com");
            Context context = getContext();
            
            android.util.Log.d("GpsPlugin", "[GPS-JAVA-TRACE] permission check - fine:" + androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACCESS_FINE_LOCATION));
            android.util.Log.d("GpsPlugin", "[GPS-JAVA-TRACE] service start requested");

            Intent intent = new Intent(context, GpsForegroundService.class);
            intent.setAction(GpsForegroundService.ACTION_START);
            intent.putExtra(GpsForegroundService.EXTRA_JOB_ID, jobId);
            intent.putExtra(GpsForegroundService.EXTRA_API_URL, apiUrl);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
            android.util.Log.d("GpsPlugin", "[GPS-JAVA-TRACE] service started");

            call.resolve();
        } catch (Exception e) {
            android.util.Log.e("GpsPlugin", "[GPS-JAVA-TRACE] exception = " + e.getMessage(), e);
            call.reject("ERROR - Java Plugin Failed: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void stopTracking(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, GpsForegroundService.class);
        intent.setAction(GpsForegroundService.ACTION_STOP);
        context.startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            getActivity().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void getDeviceInfo(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("manufacturer", Build.MANUFACTURER);
        ret.put("brand", Build.BRAND);
        ret.put("model", Build.MODEL);
        ret.put("batteryOptimizationIgnored", isIgnoringBatteryOptimizations());
        call.resolve(ret);
    }

    private boolean isIgnoringBatteryOptimizations() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            String packageName = getContext().getPackageName();
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            return pm != null && pm.isIgnoringBatteryOptimizations(packageName);
        }
        return true;
    }

    @PluginMethod
    public void isGpsEnabled(PluginCall call) {
        Context context = getContext();
        LocationManager locationManager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        boolean enabled = false;
        if (locationManager != null) {
            enabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER);
        }
        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        call.resolve(ret);
    }

    @PluginMethod
    public void openLocationSettings(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
        call.resolve();
    }

    private TextToSpeech tts;

    @PluginMethod
    public void speakText(PluginCall call) {
        String text = call.getString("text", "");
        String lang = call.getString("lang", "id-ID");
        
        call.resolve();

        Context context = getContext();
        if (context == null || text == null || text.isEmpty()) return;

        try {
            tts = new TextToSpeech(context, new TextToSpeech.OnInitListener() {
                @Override
                public void onInit(int status) {
                    if (status == TextToSpeech.SUCCESS) {
                        tts.setLanguage(new Locale("id", "ID"));
                        
                        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                            @Override
                            public void onStart(String utteranceId) {}

                            @Override
                            public void onDone(String utteranceId) {
                                if (tts != null) {
                                    tts.shutdown();
                                    tts = null;
                                }
                            }

                            @Override
                            public void onError(String utteranceId) {
                                if (tts != null) {
                                    tts.shutdown();
                                    tts = null;
                                }
                            }
                        });
                        
                        String utteranceId = "utteranceId";
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId);
                        } else {
                            HashMap<String, String> params = new HashMap<>();
                            params.put(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, utteranceId);
                            tts.speak(text, TextToSpeech.QUEUE_FLUSH, params);
                        }
                    }
                }
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
