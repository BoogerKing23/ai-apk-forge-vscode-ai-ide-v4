package com.aiapkforge.ide;

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import androidx.compose.foundation.background;
import androidx.compose.foundation.layout.Box;
import androidx.compose.foundation.layout.fillMaxSize;
import androidx.compose.material3.Surface;
import androidx.compose.material3.Text;
import androidx.compose.runtime.Composable;
import androidx.compose.ui.Modifier;
import androidx.compose.ui.graphics.Color;
import androidx.activity.compose.setContent;

public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContent(() -> {
            Surface(modifier = Modifier.fillMaxSize(), color = Color(0xFF09111F)) {
                Box(modifier = Modifier.fillMaxSize().background(Color(0xFF09111F))) {
                    Text("AI APK Forge IDE", color = Color(0xFF39D0FF));
                }
            }
        });
    }
}
