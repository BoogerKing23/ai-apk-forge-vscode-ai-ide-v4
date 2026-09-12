# ProGuard rules for AI APK Forge IDE

# Keep application classes
-keep class com.aiapkforge.** { *; }
-keepclassmembers class com.aiapkforge.** { *; }

# Keep Kotlin classes
-keep class kotlin.** { *; }
-keep interface kotlin.** { *; }
-keepclassmembers class kotlin.** { *; }

# Keep Compose classes
-keep class androidx.compose.** { *; }
-keepclassmembers class androidx.compose.** { *; }

# Keep Material3
-keep class androidx.compose.material3.** { *; }
-keepclassmembers class androidx.compose.material3.** { *; }

# Keep AndroidX
-keep class androidx.** { *; }
-keepclassmembers class androidx.** { *; }

# Keep Retrofit
-keep class retrofit2.** { *; }
-keepclassmembers class retrofit2.** { *; }
-keep interface retrofit2.** { *; }

# Keep GSON
-keep class com.google.gson.** { *; }
-keepclassmembers class com.google.gson.** { *; }
-keep class com.google.gson.stream.** { *; }

# Keep OkHttp
-keep class okhttp3.** { *; }
-keepclassmembers class okhttp3.** { *; }

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep R classes
-keepclassmembers class **.R$* {
    public static <fields>;
}

# Keep view constructors for inflation
-keepclasseswithmembers class * {
    public <init>(android.content.Context, android.util.AttributeSet);
}

# Suppress warnings
-dontwarn javax.annotation.**
-dontwarn javax.inject.**
-dontwarn sun.misc.**
-dontwarn com.google.errorprone.annotations.**
-dontwarn org.codehaus.mojo.animal_sniffer.**
