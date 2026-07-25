const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
const configPath = path.join(root, 'runtime-config.js');
const contractPath = path.join(root, 'config', 'runtime-contract.json');

function fail(message) {
  console.error(`Generated runtime config verification failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(configPath)) fail('runtime-config.js is missing');
if (!fs.existsSync(contractPath)) fail('config/runtime-contract.json is missing');

const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const source = fs.readFileSync(configPath, 'utf8');
const sandbox = { globalThis: {} };
sandbox.window = sandbox.globalThis;
vm.createContext(sandbox);

try {
  vm.runInContext(source, sandbox, { filename: 'runtime-config.js' });
} catch (error) {
  fail(`runtime-config.js cannot execute: ${error.message}`);
}

const actual = sandbox.globalThis.JULVOX_RUNTIME_CONFIG;
if (!actual) fail('JULVOX_RUNTIME_CONFIG was not exposed');

const expected = {
  schemaVersion: contract.schema_version,
  application: {
    name: contract.application.name,
    frontendVersion: contract.application.frontend_version,
    features: contract.application.features,
  },
  backend: {
    apiBaseUrl: contract.backend.api_base_url,
    healthPath: contract.backend.health_path,
  },
  pwa: {
    manifestPath: contract.pwa.manifest_path,
    serviceWorkerPath: contract.pwa.service_worker_path,
    cacheVersion: contract.pwa.cache_version,
  },
  runtime: {
    enhancementsScript: contract.runtime.enhancements_script,
  },
};

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  fail('runtime-config.js is not synchronized with config/runtime-contract.json');
}

if (!Object.isFrozen(actual)) fail('runtime config root object is not frozen');
if (!Object.isFrozen(actual.application)) fail('runtime application config is not frozen');
if (!Object.isFrozen(actual.application.features)) fail('runtime application features are not frozen');

console.log('Generated runtime config verification passed.');
