# Julvox P5.10 — Android mobile readiness

This directory is the Android shell delivered by P5.10. It lives in the canonical `julvox-frontend` repository and consumes the same verified static Julvox artifact as the web/PWA surface. It is not a second product implementation and contains no decision, retrieval, pricing, ranking or AI authority.

## Frozen architecture classification

**P5.10_ANDROID_SHELL = TEMPORARY_SHELL_OR_FOUNDATION.** This directory is the frozen P5.10 deliverable and may be evaluated later as reusable groundwork. It is **not** the final canonical Julvox mobile architecture.

A later, separately authorized mission may create the real Julvox mobile application in a distinct GitHub repository (name envisaged: `julvox-mobile`), starting with Android. P5.10 does not create that repository, does not migrate this shell into it, and does not start camera, barcode, photo/Vision, iOS or any later mobile lot.

## Read-only audit classification before implementation

### CANONICAL
- `julvox-sudo/julvox-frontend` at the P5.9 boundary is the canonical frontend/UI source used by this P5.10 shell.
- `window.JULVOX_API` remains the canonical frontend API client.
- The backend remains the authority for Product Retrieval, ProductReference, Market/World observations and DecisionEngine decisions.

### REUSABLE
- Static/PWA Julvox UI and its P5.1–P5.9 capabilities: conversation, resume, decisions, timeline, explainability, explicit preferences, manual recheck, watch, feedback and comparison/alternatives.
- Existing runtime API configuration and fail-closed network client.
- Existing PWA offline shell behavior for non-sensitive local UI state.
- Historical web scanner boundaries that already treat scanning as identification, not decision authority.

### LEGACY / INCOMPLETE
- Historical `product-barcode-scanner` uses browser `getUserMedia()` + `BarcodeDetector`; it is web/PWA groundwork for a later mobile mission, not a native Android scanner delivered by P5.10.
- Historical `product-smart-scan` is web groundwork for later product identification work and must not become an Android identification authority in P5.10.
- Source web authentication historically persists `ds_user` in `localStorage`; the Android asset adapter virtualizes that key into Android Keystore-backed encrypted storage without changing web behavior.
- Native Android notifications and deep-link/app-link verification are not claimed by P5.10.

### DUPLICATE
- No second Julvox Android/mobile repository or second native Android application was found in the connected GitHub Julvox repositories before this lot.

### ABSENT before P5.10
- AndroidManifest / Gradle Android project.
- Android package/applicationId in the Julvox repositories.
- Native secure session storage.
- Reproducible APK build and Android emulator proof.

## Android stack

- Java 17.
- Android Gradle Plugin 8.12.2, Gradle 8.13.
- compileSdk/targetSdk 36, minSdk 26.
- AndroidX WebKit 1.16.0.
- `WebViewAssetLoader` serves the bundled verified artifact as `https://julvox.com/index.html`, preserving the already authorized backend CORS origin without widening backend CORS.
- `SecureSessionBridge` stores the complete `ds_user` session encrypted with AES/GCM using an Android Keystore key. The Android-only asset shim removes that session from localStorage at rest while preserving the existing web API contract to JavaScript.

## Security and permissions

P5.10 requests only `android.permission.INTERNET`. It deliberately does not request camera, microphone, notification, storage or location permissions. All WebView media permission requests are denied in this lot. Cleartext traffic and file/content URL privileges are disabled, mixed content is forbidden, backups are disabled, and external top-level URLs are opened outside the trusted WebView.

Non-sensitive PWA UI state may continue to use localStorage. The authenticated `ds_user` session does not remain there at rest in the Android artifact. Logout/removal of `ds_user` clears the Keystore-backed encrypted session; uninstall/app-data clearing is handled by Android, and application backup is disabled.

## Network and lifecycle behavior

The UI shell is bundled in the APK, so cold start does not require the network. API calls continue through `window.JULVOX_API`, retaining its timeout/network/HTTP failure semantics. WebView state is saved/restored across ordinary background/recreation. The service-worker request path is connected to the same asset loader so bundled assets remain locally resolvable.

The app does not claim that an offline user can obtain fresh market facts or a new DecisionEngine verdict. Network loss must remain visible as missing/unavailable current data, never converted into invented prices, availability or decisions.

## Accessibility and form behavior

The shell reuses the already validated responsive Julvox HTML semantics. Android keeps normal system font scaling, focusability and `adjustResize` keyboard behavior. No orientation is forced. System bars stay outside the WebView content, while the existing viewport uses `viewport-fit=cover` for web safe-area compatibility where relevant.

## Future boundaries — intentionally NOT_STARTED

- **Barcode / EAN / camera: NOT_STARTED in P5.10.** Existing `BarcodeDetector`/getUserMedia web work is only architectural evidence. No CAMERA permission or native scanner is added here.
- **Visual product recognition: NOT_STARTED in P5.10.** No native photo capture or Vision/Gemini identification flow is added here.
- **Exhaustive Android hardening: NOT_STARTED in P5.10.** P5.10 provides the foundation and a basic emulator smoke test only; exhaustive device/permission/camera/crash matrices belong to a later authorized mission.

When later mobile work is explicitly authorized, camera/photo code may identify candidate products only. Product Retrieval resolves candidates, ProductReference establishes canonical identity, Market/World supplies observed facts, and **DecisionEngine remains backend authority** for the decision.

## Build

From repository root, prerequisites are Node 24, JDK 17, Android SDK 36 and Gradle 8.13:

```bash
npm run android:verify
gradle -p android --no-daemon :app:assembleDebug
```

Gradle first runs the complete verified web build, then creates an Android-specific generated asset copy and injects the secure-session adapter. Generated web assets and APKs remain build outputs and are not source-of-truth files.

No production deployment, Production migration, future mobile repository creation, Smart Scan implementation or business-authority duplication is part of P5.10.
