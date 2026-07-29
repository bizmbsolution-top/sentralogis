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
    private static final int DATABASE_VERSION = 1;

    public static final String TABLE_NAME = "offline_gps";
    public static final String COL_ID = "id";
    public static final String COL_JOB_ID = "job_id";
    public static final String COL_LAT = "lat";
    public static final String COL_LNG = "lng";
    public static final String COL_ACCURACY = "accuracy";
    public static final String COL_SPEED = "speed";
    public static final String COL_BATTERY = "battery";
    public static final String COL_TIMESTAMP = "timestamp";

    public OfflineGpsDbHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        String createTable = "CREATE TABLE " + TABLE_NAME + " (" +
                COL_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, " +
                COL_JOB_ID + " TEXT, " +
                COL_LAT + " REAL, " +
                COL_LNG + " REAL, " +
                COL_ACCURACY + " REAL, " +
                COL_SPEED + " REAL, " +
                COL_BATTERY + " INTEGER, " +
                COL_TIMESTAMP + " INTEGER)";
        db.execSQL(createTable);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_NAME);
        onCreate(db);
    }

    public void insertLocation(String jobId, double lat, double lng, double accuracy, double speed, int battery) {
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues values = new ContentValues();
        values.put(COL_JOB_ID, jobId);
        values.put(COL_LAT, lat);
        values.put(COL_LNG, lng);
        values.put(COL_ACCURACY, accuracy);
        values.put(COL_SPEED, speed);
        values.put(COL_BATTERY, battery);
        values.put(COL_TIMESTAMP, System.currentTimeMillis());

        db.insert(TABLE_NAME, null, values);
        db.close();
    }

    public List<OfflineLocation> getAllLocations() {
        List<OfflineLocation> locations = new ArrayList<>();
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor cursor = db.rawQuery("SELECT * FROM " + TABLE_NAME, null);

        if (cursor.moveToFirst()) {
            do {
                OfflineLocation loc = new OfflineLocation();
                loc.id = cursor.getInt(cursor.getColumnIndexOrThrow(COL_ID));
                loc.jobId = cursor.getString(cursor.getColumnIndexOrThrow(COL_JOB_ID));
                loc.lat = cursor.getDouble(cursor.getColumnIndexOrThrow(COL_LAT));
                loc.lng = cursor.getDouble(cursor.getColumnIndexOrThrow(COL_LNG));
                loc.accuracy = cursor.getDouble(cursor.getColumnIndexOrThrow(COL_ACCURACY));
                loc.speed = cursor.getDouble(cursor.getColumnIndexOrThrow(COL_SPEED));
                loc.battery = cursor.getInt(cursor.getColumnIndexOrThrow(COL_BATTERY));
                loc.timestamp = cursor.getLong(cursor.getColumnIndexOrThrow(COL_TIMESTAMP));
                locations.add(loc);
            } while (cursor.moveToNext());
        }
        cursor.close();
        db.close();
        return locations;
    }

    public void deleteLocation(int id) {
        SQLiteDatabase db = this.getWritableDatabase();
        db.delete(TABLE_NAME, COL_ID + " = ?", new String[]{String.valueOf(id)});
        db.close();
    }

    public static class OfflineLocation {
        public int id;
        public String jobId;
        public double lat;
        public double lng;
        public double accuracy;
        public double speed;
        public int battery;
        public long timestamp;
    }
}
