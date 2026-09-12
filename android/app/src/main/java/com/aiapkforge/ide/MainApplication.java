package com.aiapkforge.ide;

import android.app.Application;
import android.util.Log;

public class MainApplication extends Application {
    private static final String TAG = "MainApplication";

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "AI APK Forge IDE initialized");
    }
}
