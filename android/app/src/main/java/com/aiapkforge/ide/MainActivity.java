package com.aiapkforge.ide;

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import androidx.compose.foundation.background;
import androidx.compose.foundation.layout.*;
import androidx.compose.material3.MaterialTheme;
import androidx.compose.material3.Surface;
import androidx.compose.material3.Text;
import androidx.compose.runtime.Composable;
import androidx.compose.ui.Alignment;
import androidx.compose.ui.Modifier;
import androidx.compose.ui.graphics.Color;
import androidx.compose.ui.text.font.FontWeight;
import androidx.compose.ui.unit.dp;
import androidx.compose.ui.unit.sp;
import androidx.activity.compose.setContent;

public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContent(() -> {
            Surface(
                Modifier.fillMaxSize(),
                Color.parseColor("#09111F")
            ) {
                Column(
                    Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    Alignment.CenterHorizontally,
                    Arrangement.Center
                ) {
                    Text(
                        "AI APK Forge IDE",
                        fontSize = new sp(32),
                        fontWeight = FontWeight.Bold,
                        color = Color.parseColor("#39D0FF")
                    );
                    
                    Spacer(Modifier.height(8.dp));
                    
                    Text(
                        "v1.0.0",
                        fontSize = new sp(14),
                        color = Color.parseColor("#A9B8CC")
                    );
                }
            }
        });
    }
}
