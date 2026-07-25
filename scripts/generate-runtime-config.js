const fs = require('fs');
const path = require('path');

const root = process.cwd();
const contractPath = path.join(root, 'config', 'runtime-contract.json');
const outputPath = path.join(root, 'runtime-config.js');

function fail(message) {
  console.error(`Runtime config generation failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(contractPath)) fail('config/runtime-contract.json is missing');

let contract;
try {
  contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
} catch (error) {
  fail(`invalid JSON: ${error.message}`);
}

const config = {
  schemaVersion: contract.schema_version,
  application: {
    name: contract.application?.name,
    frontendVersion: contract.application?.frontend_version,
  },
  backend: {
    apiBaseUrl: contract.backend?.api_base_url,
    healthPath: contract.backend?.health_path,
  },
  pwa: {
    manifestPath: contract.pwa?.manifest_path,
    serviceWorkerPath: contract.pwa?.service_worker_path,
    cacheVersion: contract.pwa?.cache_version,
  },
  runtime: {
    enhancementsScript: contract.runtime?.enhancements_script,
  },
};

for (const [label, value] of [
  ['schemaVersion', config.schemaVersion],
  ['application.name', config.application.name],
  ['application.frontendVersion', config.application.frontendVersion],
  ['backend.apiBaseUrl', config.backend.apiBaseUrl],
  ['backend.healthPath', config.backend.healthPath],
  ['pwa.manifestPath', config.pwa.manifestPath],
  ['pwa.serviceWorkerPath', config.pwa.serviceWorkerPath],
  ['pwa.cacheVersion', config.pwa.cacheVersion],
  ['runtime.enhancementsScript', config.runtime.enhancementsScript],
]) {
  if (value === undefined || value === null || value === '') fail(`missing value: ${label}`);
}

const content = `// Generated from config/runtime-contract.json. Do not edit manually.\n` +
  `(function (global) {\n` +
  `  'use strict';\n` +
  `  const config = Object.freeze(${JSON.stringify(config, null, 2)});\n` +
  `  Object.defineProperty(global, 'JULVOX_RUNTIME_CONFIG', {\n` +
  `    value: config,\n` +
  `    writable: false,\n` +
  `    configurable: false,\n` +
  `    enumerable: true,\n` +
  `  });\n` +
  `})(typeof window !== 'undefined' ? window : globalThis);\n`;

fs.writeFileSync(outputPath, content, 'utf8');
console.log('Generated runtime-config.js from config/runtime-contract.json.');
