const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const fail = (message) => { throw new Error(`P5.10 Android foundation verification failed: ${message}`); };

const manifest = read('android/app/src/main/AndroidManifest.xml');
const gradle = read('android/app/build.gradle');
const main = read('android/app/src/main/java/com/julvox/app/MainActivity.java');
const secure = read('android/app/src/main/java/com/julvox/app/SecureSessionBridge.java');
const prepare = read('scripts/android/prepare-web-assets.js');
const network = read('android/app/src/main/res/xml/network_security_config.xml');
const workflow = read('.github/workflows/android-foundation.yml');

const permissions = [...manifest.matchAll(/<uses-permission\s+android:name="([^"]+)"/gu)].map((match) => match[1]);
if (permissions.length !== 1 || permissions[0] !== 'android.permission.INTERNET') fail(`unexpected permissions: ${permissions.join(', ')}`);
for (const forbidden of ['CAMERA', 'RECORD_AUDIO', 'POST_NOTIFICATIONS', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION']) {
  if (manifest.includes(`android.permission.${forbidden}`)) fail(`forbidden P5.10 permission ${forbidden}`);
}
if (!manifest.includes('android:allowBackup="false"')) fail('application backup must be disabled for the secure session foundation');
if (!manifest.includes('android:usesCleartextTraffic="false"') || !network.includes('cleartextTrafficPermitted="false"')) fail('cleartext networking is not fully disabled');

for (const expected of ["applicationId 'com.julvox.app'", 'minSdk 26', 'targetSdk 36', 'compileSdk 36', "androidx.webkit:webkit:1.16.0"]) {
  if (!gradle.includes(expected)) fail(`missing pinned Android contract ${expected}`);
}
for (const expected of ['setDomain(APP_HOST)', 'setHttpAllowed(false)', 'setAllowFileAccess(false)', 'setAllowContentAccess(false)', 'MIXED_CONTENT_NEVER_ALLOW', 'request.deny()', 'ServiceWorkerController.getInstance()', 'restoreState(savedInstanceState)', 'saveState(outState)']) {
  if (!main.includes(expected)) fail(`missing hardened WebView/lifecycle contract ${expected}`);
}
if (!main.includes('APP_HOST = "julvox.com"')) fail('local Android origin must remain the already-authorized Julvox HTTPS origin');
if (!main.includes('addJavascriptInterface(secureSessionBridge, BRIDGE_NAME)')) fail('secure session bridge is not wired');

for (const expected of ['AndroidKeyStore', 'AES/GCM/NoPadding', 'KeyProperties.PURPOSE_ENCRYPT', 'KeyProperties.PURPOSE_DECRYPT', '@JavascriptInterface', 'clearSession()']) {
  if (!secure.includes(expected)) fail(`secure storage contract missing ${expected}`);
}
for (const forbidden of ['System.out', 'Log.', 'printStackTrace', 'token=']) {
  if (secure.includes(forbidden)) fail(`secure bridge may expose session material via ${forbidden}`);
}
for (const expected of ["const key = 'ds_user'", 'bridge.storeSession(serialized)', 'bridge.getSession()', 'bridge.clearSession()', 'originalRemoveItem.call(storage, key)', "businessAuthority: 'backend-only'", "cameraPermission: 'denied-p5.10'"]) {
  if (!prepare.includes(expected)) fail(`Android asset/session adapter missing ${expected}`);
}

const nativeSources = `${main}\n${secure}\n${gradle}`;
for (const forbidden of ['DecisionEngine', 'evaluate_and_save', 'deal_quality_score', 'target_price', 'affiliate_url', 'Gemini', 'BarcodeDetector', 'ProductReference']) {
  if (nativeSources.includes(forbidden)) fail(`native layer must not acquire business/scan authority: ${forbidden}`);
}

for (const expected of ['gradle-version: 8.13', 'platforms;android-36', ':app:assembleDebug', 'verify-apk-secrets.js', 'airplane_mode_on 1', 'am start -W']) {
  if (!workflow.includes(expected)) fail(`Android CI contract missing ${expected}`);
}

const androidTree = [
  manifest, gradle, main, secure, prepare, network,
  read('android/settings.gradle'), read('android/build.gradle'), read('android/gradle.properties'),
].join('\n');
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  /AIza[0-9A-Za-z_-]{30,}/u,
  /sk-(?:proj-)?[0-9A-Za-z_-]{20,}/u,
  /ghp_[0-9A-Za-z]{30,}/u,
  /xox[baprs]-[0-9A-Za-z-]{20,}/u,
];
if (secretPatterns.some((pattern) => pattern.test(androidTree))) fail('secret-like material detected in Android source/config');

console.log('P5.10 Android foundation verification PASS: minimal permissions, secure session, backend-only authority, pinned build contract.');
