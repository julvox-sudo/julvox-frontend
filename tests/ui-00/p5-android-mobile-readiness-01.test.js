const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..', '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const manifest = read('android/app/src/main/AndroidManifest.xml');
const gradle = read('android/app/build.gradle');
const main = read('android/app/src/main/java/com/julvox/app/MainActivity.java');
const secure = read('android/app/src/main/java/com/julvox/app/SecureSessionBridge.java');
const prepare = read('scripts/android/prepare-web-assets.js');
const docs = read('android/README.md');
const workflow = read('.github/workflows/android-foundation.yml');

test('P5.10 creates one Android shell in the canonical frontend repository with pinned SDK/build inputs', () => {
  assert.match(gradle, /applicationId 'com\.julvox\.app'/u);
  assert.match(gradle, /minSdk 26/u);
  assert.match(gradle, /targetSdk 36/u);
  assert.match(gradle, /compileSdk 36/u);
  assert.match(read('android/build.gradle'), /com\.android\.application' version '8\.12\.2'/u);
  assert.match(workflow, /gradle-version: 8\.13/u);
});

test('P5.10 requests INTERNET only and deliberately does not request camera, notification, storage, audio or location', () => {
  const permissions = [...manifest.matchAll(/<uses-permission\s+android:name="([^"]+)"/gu)].map((match) => match[1]);
  assert.deepEqual(permissions, ['android.permission.INTERNET']);
  assert.doesNotMatch(manifest, /CAMERA|POST_NOTIFICATIONS|RECORD_AUDIO|EXTERNAL_STORAGE|ACCESS_FINE_LOCATION|ACCESS_COARSE_LOCATION/u);
});

test('P5.10 serves the verified web artifact over the existing HTTPS Julvox origin without file URL privileges', () => {
  assert.match(main, /APP_HOST = "julvox\.com"/u);
  assert.match(main, /setDomain\(APP_HOST\)/u);
  assert.match(main, /setHttpAllowed\(false\)/u);
  assert.match(main, /setAllowFileAccess\(false\)/u);
  assert.match(main, /setAllowContentAccess\(false\)/u);
  assert.match(main, /MIXED_CONTENT_NEVER_ALLOW/u);
});

test('P5.10 stores the whole authenticated ds_user session through Android Keystore instead of Android localStorage at rest', () => {
  assert.match(secure, /AndroidKeyStore/u);
  assert.match(secure, /AES\/GCM\/NoPadding/u);
  assert.match(prepare, /const key = 'ds_user'/u);
  assert.match(prepare, /bridge\.storeSession\(serialized\)/u);
  assert.match(prepare, /bridge\.getSession\(\)/u);
  assert.match(prepare, /originalRemoveItem\.call\(storage, key\)/u);
  assert.doesNotMatch(secure, /Log\.|System\.out|printStackTrace/u);
});

test('P5.10 keeps business, decision, retrieval and scan authority out of native Android code', () => {
  const native = `${main}\n${secure}\n${gradle}`;
  for (const forbidden of ['DecisionEngine', 'evaluate_and_save', 'ProductReference', 'deal_quality_score', 'target_price', 'affiliate_url', 'Gemini', 'BarcodeDetector']) {
    assert.doesNotMatch(native, new RegExp(forbidden, 'u'));
  }
  assert.match(prepare, /businessAuthority: 'backend-only'/u);
});

test('P5.10 fails camera/media permission requests closed until the dedicated later mobile lots', () => {
  assert.match(main, /onPermissionRequest\(PermissionRequest request\)/u);
  assert.match(main, /request\.deny\(\)/u);
  assert.match(prepare, /cameraPermission: 'denied-p5\.10'/u);
  assert.match(docs, /P5\.11.*NOT_STARTED/su);
  assert.match(docs, /P5\.12.*NOT_STARTED/su);
  assert.match(docs, /P5\.13.*NOT_STARTED/su);
});

test('P5.10 preserves cold start, background state, back navigation and local offline shell loading', () => {
  assert.match(main, /restoreState\(savedInstanceState\)/u);
  assert.match(main, /saveState\(outState\)/u);
  assert.match(main, /webView\.onPause\(\)/u);
  assert.match(main, /webView\.onResume\(\)/u);
  assert.match(main, /webView\.canGoBack\(\)/u);
  assert.match(main, /ServiceWorkerController\.getInstance\(\)/u);
  assert.match(main, /webView\.loadUrl\(START_URL\)/u);
});

test('P5.10 disables backups and cleartext transport for the Android session boundary', () => {
  assert.match(manifest, /android:allowBackup="false"/u);
  assert.match(manifest, /android:usesCleartextTraffic="false"/u);
  assert.match(read('android/app/src/main/res/xml/network_security_config.xml'), /cleartextTrafficPermitted="false"/u);
});

test('P5.10 CI builds an APK and exercises online start, offline cold start and background resume on an emulator', () => {
  assert.match(workflow, /:app:assembleDebug/u);
  assert.match(workflow, /avdmanager create avd/u);
  assert.match(workflow, /airplane_mode_on 1/u);
  assert.match(workflow, /am force-stop com\.julvox\.app/u);
  assert.match(workflow, /am start -W com\.julvox\.app\/\.MainActivity/u);
  assert.match(workflow, /KEYCODE_HOME/u);
});

test('P5.10 documents reusable web mobile groundwork but freezes Smart Scan and visual recognition for later lots', () => {
  assert.match(docs, /CANONICAL/u);
  assert.match(docs, /REUSABLE/u);
  assert.match(docs, /LEGACY/u);
  assert.match(docs, /ABSENT/u);
  assert.match(docs, /BarcodeDetector/u);
  assert.match(docs, /DecisionEngine.*backend/su);
});
