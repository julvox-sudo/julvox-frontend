const fs = require('fs');
const path = require('path');

const root = process.cwd();
const contractPath = path.join(root, 'config', 'runtime-contract.json');
const outputPath = path.join(root, 'dist', 'runtime-config.js');
const PREVIEW_BACKEND_ENV = 'JULVOX_BACKEND_API_BASE_URL';

function fail(message) {
  console.error(`Runtime config generation failed: ${message}`);
  process.exit(1);
}

function validateBackendApiBaseUrl(value, label) {
  if (typeof value !== 'string' || !value || value !== value.trim()) fail(`${label} must be a non-empty trimmed URL`);
  let parsed;
  try { parsed = new URL(value); }
  catch (error) { fail(`${label} is not a valid URL: ${error.message}`); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) {
    fail(`${label} must be an HTTPS URL without credentials, query string or fragment`);
  }
  return value.replace(/\/+$/u, '');
}

if (!fs.existsSync(contractPath)) fail('config/runtime-contract.json is missing');

let contract;
try {
  contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
} catch (error) {
  fail(`invalid JSON: ${error.message}`);
}

const contractBackendApiBaseUrl = validateBackendApiBaseUrl(contract.backend?.api_base_url, 'contract backend.api_base_url');
const explicitBackendOverride = process.env[PREVIEW_BACKEND_ENV] || '';
const vercelEnvironment = String(process.env.VERCEL_ENV || '').trim().toLowerCase();
const isVercelPreview = vercelEnvironment === 'preview';

if (isVercelPreview && !explicitBackendOverride) {
  fail(`Vercel Preview requires ${PREVIEW_BACKEND_ENV}; falling back to the canonical production backend is forbidden`);
}

let backendApiBaseUrl = contract.backend?.api_base_url;
if (explicitBackendOverride) {
  backendApiBaseUrl = validateBackendApiBaseUrl(explicitBackendOverride, PREVIEW_BACKEND_ENV);
  if (backendApiBaseUrl === contractBackendApiBaseUrl) {
    fail(`${PREVIEW_BACKEND_ENV} explicitly targets the canonical production backend`);
  }
}
if (isVercelPreview && backendApiBaseUrl === contractBackendApiBaseUrl) {
  fail('Vercel Preview cannot use the canonical production backend');
}

const config = {
  schemaVersion: contract.schema_version,
  application: {
    name: contract.application?.name,
    frontendVersion: contract.application?.frontend_version,
    capabilities: contract.application?.capabilities,
  },
  backend: {
    apiBaseUrl: backendApiBaseUrl,
    healthPath: contract.backend?.health_path,
  },
  pwa: {
    manifestPath: contract.pwa?.manifest_path,
    serviceWorkerPath: contract.pwa?.service_worker_path,
    cacheVersion: contract.pwa?.cache_version,
  },
  runtime: {
    environment: contract.runtime?.environment,
    enhancementsScript: contract.runtime?.enhancements_script,
  },
};

for (const [label, value] of [
  ['schemaVersion', config.schemaVersion],
  ['application.name', config.application.name],
  ['application.frontendVersion', config.application.frontendVersion],
  ['application.capabilities', config.application.capabilities],
  ['backend.apiBaseUrl', config.backend.apiBaseUrl],
  ['backend.healthPath', config.backend.healthPath],
  ['pwa.manifestPath', config.pwa.manifestPath],
  ['pwa.serviceWorkerPath', config.pwa.serviceWorkerPath],
  ['pwa.cacheVersion', config.pwa.cacheVersion],
  ['runtime.environment', config.runtime.environment],
  ['runtime.enhancementsScript', config.runtime.enhancementsScript],
]) {
  if (value === undefined || value === null || value === '') fail(`missing value: ${label}`);
}

const content = `// Generated from config/runtime-contract.json. Do not edit manually.\n` +
  `(function (global) {\n` +
  `  'use strict';\n` +
  `  function deepFreeze(value) {\n` +
  `    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;\n` +
  `    Object.freeze(value);\n` +
  `    for (const nested of Object.values(value)) deepFreeze(nested);\n` +
  `    return value;\n` +
  `  }\n` +
  `  const config = deepFreeze(${JSON.stringify(config, null, 2)});\n` +
  `  Object.defineProperty(global, 'JULVOX_RUNTIME_CONFIG', {\n` +
  `    value: config,\n` +
  `    writable: false,\n` +
  `    configurable: false,\n` +
  `    enumerable: true,\n` +
  `  });\n` +
  `})(typeof window !== 'undefined' ? window : globalThis);\n`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, content, 'utf8');
console.log(`Generated dist/runtime-config.js from config/runtime-contract.json${explicitBackendOverride ? ` with ${PREVIEW_BACKEND_ENV}` : ''}.`);