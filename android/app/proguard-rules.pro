-keep class com.aiapkforge.** { *; }
-keep class androidx.** { *; }
-keep class kotlin.** { *; }
-keepclassmembers class * {
    native <methods>;
}
-keepclasseswithmembers class * {
    public <init>(android.content.Context, android.util.AttributeSet);
}
-dontwarn javax.annotation.**
-dontwarn javax.inject.**
