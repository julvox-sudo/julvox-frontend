// Generated from config/runtime-contract.json. Do not edit manually.
(function (global) {
  'use strict';
  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    for (const nested of Object.values(value)) deepFreeze(nested);
    return value;
  }
  const config = deepFreeze({
  "schemaVersion": 1,
  "application": {
    "name": "Julvox",
    "frontendVersion": "17.0.0",
    "capabilities": {
      "deals": {
        "status": "supported"
      },
      "deal_detail": {
        "status": "supported"
      },
      "price_history": {
        "status": "supported"
      },
      "search": {
        "status": "supported"
      },
      "filters": {
        "status": "supported"
      },
      "comparison": {
        "status": "supported"
      },
      "favorites": {
        "status": "partial"
      },
      "alerts": {
        "status": "supported"
      },
      "wishlist": {
        "status": "supported"
      },
      "community": {
        "status": "partial"
      },
      "newsletter": {
        "status": "supported"
      },
      "authentication": {
        "status": "supported"
      },
      "account": {
        "status": "supported"
      },
      "premium": {
        "status": "partial"
      },
      "stripe": {
        "status": "partial"
      },
      "paypal": {
        "status": "partial"
      },
      "push": {
        "status": "partial"
      },
      "pwa": {
        "status": "supported"
      },
      "offline": {
        "status": "partial"
      },
      "ai": {
        "status": "experimental"
      },
      "recommendations": {
        "status": "experimental"
      },
      "pro_api": {
        "status": "experimental"
      },
      "gamification": {
        "status": "experimental"
      },
      "reports": {
        "status": "partial"
      },
      "scanner": {
        "status": "unavailable"
      },
      "local_analysis": {
        "status": "demo-only"
      },
      "demo_fixtures": {
        "status": "demo-only"
      }
    }
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
    "environment": "production",
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
