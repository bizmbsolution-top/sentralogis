package com.sentralogis.driver;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import java.util.ArrayList;
import java.util.List;

public class OfflineGpsDbHelper extends SQLiteOpenHelper {

    private static final String DATABASE_NAME = "offline_gps.db";
    private static final int DATABASE_VERSION = 2;

    public static final String TABLE_NAME = "offline_gps";
    public static final String COL_ID = "id";
    public static final String COL_CLIENT_PING_ID = "client_ping_id";
    public static final String COL_JOB_ID = "job_id";
    public static final String COL_LAT = "lat";
    public static final String COL_LNG = "lng";
    public static final String COL_ACCURACY = "accuracy";
    public static final String COL_SPEED = "speed";
    public static final String COL_BATTERY = "battery";
    public static final String COL_TIMESTAMP = "timestamp";
    public static final String COL_CREATED_AT = "created_at";
    public static final String COL_SYNC_STATUS = "sync_status";
    public static final String COL_SYNC_ATTEMPT_COUNT = "sync_attempt_count";

    public OfflineGpsDbHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        String createTable = "CREATE TABLE " + TABLE_NAME + " (" +
                COL_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, " +
                COL_CLIENT_PING_ID + " TEXT, " +
                COL_JOB_ID + " TEXT, " +
                COL_LAT + " REAL, " +
                COL_LNG + " REAL, " +
                COL_ACCURACY + " REAL, " +
                COL_SPEED + " REAL, " +
                COL_BATTERY + " INTEGER, " +
                COL_TIMESTAMP + " INTEGER, " +
                COL_CREATED_AT + " TEXT, " +
                COL_SYNC_STATUS + " TEXT, " +
                COL_SYNC_ATTEMPT_COUNT + " INTEGER)";
        db.execSQL(createTable);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_NAME);
        onCreate(db);
    }

    public void insertLocation(String clientPingId, String jobId, double lat, double lng, double accuracy, double speed, int battery, long timestamp) {
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues values = new ContentValues();
        values.put(COL_CLIENT_PING_ID, clientPingId);
        values.put(COL_JOB_ID, jobId);
        values.put(COL_LAT, lat);
        values.put(COL_LNG, lng);
        values.put(COL_ACCURACY, accuracy);
        values.put(COL_SPEED, speed);
        values.put(COL_BATTERY, battery);
        values.put(COL_TIMESTAMP, timestamp);
        values.put(COL_CREATED_AT, String.valueOf(System.currentTimeMillis()));
        values.put(COL_SYNC_STATUS, "PENDING");
        values.put(COL_SYNC_ATTEMPT_COUNT, 0);

        db.insert(TABLE_NAME, null, values);
        db.close();

        android.util.Log.d("SentraLogisGPS", "[GPS_SYNC_FORENSIC] ENQUEUE queue_storage_source=sqlite client_ping_id=" + clientPingId);
    }

    public List<OfflineLocation> getPendingLocations(int limit) {
        List<OfflineLocation> locations = new ArrayList<>();
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor cursor = db.rawQuery("SELECT * FROM " + TABLE_NAME + " WHERE " + COL_SYNC_STATUS + " = 'PENDING' ORDER BY " + COL_TIMESTAMP + " ASC LIMIT " + limit, null);

        if (cursor.moveToFirst()) {
            do {
                OfflineLocation loc = new OfflineLocation();
                loc.id = cursor.getInt(cursor.getColumnIndexOrThrow(COL_ID));
                loc.clientPingId = cursor.getString(cursor.getColumnIndexOrThrow(COL_CLIENT_PING_ID));
                loc.jobId = cursor.getString(cursor.getColumnIndexOrThrow(COL_JOB_ID));
                loc.lat = cursor.getDouble(cursor.getColumnIndexOrThrow(COL_LAT));
                loc.lng = cursor.getDouble(cursor.getColumnIndexOrThrow(COL_LNG));
                loc.accuracy = cursor.getDouble(cursor.getColumnIndexOrThrow(COL_ACCURACY));
                loc.speed = cursor.getDouble(cursor.getColumnIndexOrThrow(COL_SPEED));
                loc.battery = cursor.getInt(cursor.getColumnIndexOrThrow(COL_BATTERY));
                loc.timestamp = cursor.getLong(cursor.getColumnIndexOrThrow(COL_TIMESTAMP));
                loc.syncStatus = cursor.getString(cursor.getColumnIndexOrThrow(COL_SYNC_STATUS));
                locations.add(loc);
            } while (cursor.moveToNext());
        }
        cursor.close();
        db.close();

        if (!locations.isEmpty()) {
            StringBuilder ids = new StringBuilder();
            for (int i = 0; i < locations.size(); i++) {
                ids.append(locations.get(i).clientPingId);
                if (i < locations.size() - 1) ids.append(",");
            }
            android.util.Log.d("SentraLogisGPS", "[GPS_SYNC_FORENSIC] READ_PENDING queue_storage_source=sqlite pending_count=" + locations.size() + " ids=" + ids.toString());
        }

        return locations;
    }

    public void deleteLocation(int id) {
        SQLiteDatabase db = this.getWritableDatabase();
        db.delete(TABLE_NAME, COL_ID + " = ?", new String[]{String.valueOf(id)});
        db.close();
    }

    public void updateStatus(List<String> clientPingIds, String status) {
        if (clientPingIds == null || clientPingIds.isEmpty()) return;
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues values = new ContentValues();
        values.put(COL_SYNC_STATUS, status);
        
        StringBuilder placeholders = new StringBuilder();
        for (int i = 0; i < clientPingIds.size(); i++) {
            placeholders.append("?");
            if (i < clientPingIds.size() - 1) placeholders.append(",");
        }
        
        db.update(TABLE_NAME, values, COL_CLIENT_PING_ID + " IN (" + placeholders.toString() + ")", clientPingIds.toArray(new String[0]));
        db.close();
    }

    public void resetSyncingToPending() {
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues values = new ContentValues();
        values.put(COL_SYNC_STATUS, "PENDING");
        db.update(TABLE_NAME, values, COL_SYNC_STATUS + " = ?", new String[]{"SYNCING"});
        db.close();
    }

    public void deleteSyncedLocations() {
        SQLiteDatabase db = this.getWritableDatabase();
        db.delete(TABLE_NAME, COL_SYNC_STATUS + " = ?", new String[]{"SYNCED"});
        db.close();
    }

    public int getTotalLocationsCount() {
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor cursor = db.rawQuery("SELECT COUNT(*) FROM " + TABLE_NAME, null);
        int count = 0;
        if (cursor != null) {
            if (cursor.moveToFirst()) {
                count = cursor.getInt(0);
            }
            cursor.close();
        }
        return count;
    }

    public int getPendingLocationsCount() {
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor cursor = db.rawQuery("SELECT COUNT(*) FROM " + TABLE_NAME + " WHERE " + COL_SYNC_STATUS + " = 'PENDING' OR " + COL_SYNC_STATUS + " = 'SYNCING'", null);
        int count = 0;
        if (cursor != null) {
            if (cursor.moveToFirst()) {
                count = cursor.getInt(0);
            }
            cursor.close();
        }
        return count;
    }

    public static class OfflineLocation {
        public int id;
        public String clientPingId;
        public String jobId;
        public double lat;
        public double lng;
        public double accuracy;
        public double speed;
        public int battery;
        public long timestamp;
        public String syncStatus;
    }
}
