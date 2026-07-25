// Generated from config/runtime-contract.json. Do not edit manually.
(function (global) {
  'use strict';
  const config = Object.freeze({
  "schemaVersion": 1,
  "application": {
    "name": "DealScan",
    "frontendVersion": "17.0.0"
  },
  "backend": {
    "apiBaseUrl": "https://julvox-dealscan-backend-production.up.railway.app",
    "healthPath": "/health"
  },
  "pwa": {
    "manifestPath": "/manifest.json",
    "serviceWorkerPath": "/sw.js",
    "cacheVersion": "v17"
  },
  "runtime": {
    "enhancementsScript": "enhancements_v3.js"
  }
});
  Object.defineProperty(global, 'JULVOX_RUNTIME_CONFIG', {
    value: config,
    writable: false,
    configurable: false,
    enumerable: true,
  });
})(typeof window !== 'undefined' ? window : globalThis);
