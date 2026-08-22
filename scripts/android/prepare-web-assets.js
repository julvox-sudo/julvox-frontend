const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const source = path.join(root, 'dist');
const output = process.env.JULVOX_ANDROID_ASSET_OUTPUT
  ? path.resolve(process.env.JULVOX_ANDROID_ASSET_OUTPUT)
  : path.join(root, 'android', 'app', 'build', 'generated', 'julvoxWeb', 'assets');
const indexPath = path.join(output, 'index.html');
const MARKER = 'julvox-p5-10-android-secure-session';

if (!fs.existsSync(path.join(source, 'index.html'))) {
  throw new Error('P5.10 Android asset preparation requires a completed dist build');
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
fs.cpSync(source, output, { recursive: true });

const shim = `<script id="${MARKER}">\n(function (global) {\n  'use strict';\n  const bridge = global.JulvoxSecureSession;\n  if (!bridge || typeof bridge.storeSession !== 'function' || typeof bridge.getSession !== 'function' || typeof bridge.clearSession !== 'function') return;\n  const storage = global.localStorage;\n  const key = 'ds_user';\n  const originalSetItem = Storage.prototype.setItem;\n  const originalGetItem = Storage.prototype.getItem;\n  const originalRemoveItem = Storage.prototype.removeItem;\n  const originalClear = Storage.prototype.clear;\n\n  function validSession(value) {\n    if (typeof value !== 'string' || !value) return false;\n    try { const parsed = JSON.parse(value); return !!parsed && typeof parsed === 'object'; }\n    catch (_) { return false; }\n  }\n\n  Storage.prototype.setItem = function (name, value) {\n    if (this === storage && name === key) {\n      const serialized = String(value);\n      if (!validSession(serialized)) { bridge.clearSession(); originalRemoveItem.call(storage, key); return; }\n      bridge.storeSession(serialized);\n      originalRemoveItem.call(storage, key);\n      return;\n    }\n    return originalSetItem.call(this, name, value);\n  };\n\n  Storage.prototype.getItem = function (name) {\n    if (this === storage && name === key) {\n      const secure = bridge.getSession();\n      return validSession(secure) ? secure : null;\n    }\n    return originalGetItem.call(this, name);\n  };\n\n  Storage.prototype.removeItem = function (name) {\n    if (this === storage && name === key) { bridge.clearSession(); originalRemoveItem.call(storage, key); return; }\n    return originalRemoveItem.call(this, name);\n  };\n\n  Storage.prototype.clear = function () {\n    if (this === storage) bridge.clearSession();\n    return originalClear.call(this);\n  };\n\n  const legacy = originalGetItem.call(storage, key);\n  if (legacy) {\n    if (validSession(legacy)) bridge.storeSession(legacy);\n    originalRemoveItem.call(storage, key);\n  }\n\n  Object.defineProperty(global, 'JULVOX_ANDROID_RUNTIME', {\n    value: Object.freeze({\n      platform: 'android',\n      secureSession: true,\n      businessAuthority: 'backend-only',\n      cameraPermission: 'denied-p5.10'\n    }),\n    writable: false,\n    configurable: false\n  });\n})(window);\n</script>`;

let html = fs.readFileSync(indexPath, 'utf8');
if (html.includes(MARKER)) throw new Error('P5.10 Android secure-session shim already present');
if (!html.includes('</head>')) throw new Error('P5.10 Android asset preparation cannot find </head>');
html = html.replace('</head>', `${shim}\n</head>`);
fs.writeFileSync(indexPath, html, 'utf8');

function listFiles(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const relative = path.posix.join(prefix, entry.name);
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) return listFiles(absolute, relative);
      if (relative === 'android-asset-manifest.json') return [];
      const data = fs.readFileSync(absolute);
      return [{ path: relative, bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') }];
    });
}

const files = listFiles(output);
fs.writeFileSync(path.join(output, 'android-asset-manifest.json'), `${JSON.stringify({
  schemaVersion: 1,
  authority: 'frontend-artifact-only',
  businessAuthority: 'backend-only',
  source: 'dist',
  files,
}, null, 2)}\n`, 'utf8');

console.log(`P5.10 Android assets prepared: ${files.length} files; secure session shim injected; no native business authority.`);
