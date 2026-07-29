package com.sentralogis.driver;

import android.content.Context;
import android.content.Intent;
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
        String jobId = call.getString("jobId", "Active Job");
        String apiUrl = call.getString("apiUrl", "https://www.sentralogis.com");
        Context context = getContext();
        Intent intent = new Intent(context, GpsForegroundService.class);
        intent.setAction(GpsForegroundService.ACTION_START);
        intent.putExtra(GpsForegroundService.EXTRA_JOB_ID, jobId);
        intent.putExtra(GpsForegroundService.EXTRA_API_URL, apiUrl);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }

        call.resolve();
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
}
