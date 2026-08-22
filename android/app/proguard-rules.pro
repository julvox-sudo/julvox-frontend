# P5.10 keeps the JavaScript bridge name stable for the bundled Julvox artifact.
-keepclassmembers class com.julvox.app.SecureSessionBridge {
    @android.webkit.JavascriptInterface <methods>;
}
