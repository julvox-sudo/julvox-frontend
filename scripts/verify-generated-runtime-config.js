const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
const failures = [];
function fail(message) { failures.push(message); }
function readJson(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) { fail(`Missing required file: ${relativePath}`); return {}; }
  try { return JSON.parse(fs.readFileSync(absolutePath, 'utf8')); }
  catch (error) { fail(`${relativePath} is not valid JSON: ${error.message}`); return {}; }
}

const contract = readJson('config/runtime-contract.json');
const generatedPath = path.join(root, 'runtime-config.js');
if (!fs.existsSync(generatedPath)) fail('runtime-config.js is missing');
let actual = null;
if (!failures.length) {
  const sandbox = { globalThis: {} };
  sandbox.window = sandbox.globalThis;
  vm.createContext(sandbox);
  try {
    vm.runInContext(fs.readFileSync(generatedPath, 'utf8'), sandbox, { filename: 'runtime-config.js' });
    actual = sandbox.globalThis.JULVOX_RUNTIME_CONFIG;
  } catch (error) { fail(`runtime-config.js cannot execute: ${error.message}`); }
}
const expected = {
  schemaVersion: contract.schema_version,
  application: {
    name: contract.application?.name,
    frontendVersion: contract.application?.frontend_version,
    capabilities: contract.application?.capabilities,
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
    environment: contract.runtime?.environment,
    enhancementsScript: contract.runtime?.enhancements_script,
  },
};
if (actual && JSON.stringify(actual) !== JSON.stringify(expected)) fail('generated runtime config differs from runtime contract');
function verifyDeepFrozen(value, label) {
  if (!value || typeof value !== 'object') return;
  if (!Object.isFrozen(value)) fail(`${label} is not frozen`);
  for (const [key, nested] of Object.entries(value)) verifyDeepFrozen(nested, `${label}.${key}`);
}
if (actual) verifyDeepFrozen(actual, 'runtime config');
if (failures.length) {
  console.error('Generated runtime config verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Generated runtime config verification passed.');
