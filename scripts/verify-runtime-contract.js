const fs = require('fs');
const path = require('path');

const root = process.cwd();
const contractPath = path.join(root, 'config', 'runtime-contract.json');
const failures = [];
const allowedStatuses = new Set(['supported', 'partial', 'experimental', 'unavailable', 'demo-only']);
const expectedCapabilities = [
  'deals','deal_detail','price_history','search','filters','comparison','favorites','alerts','wishlist',
  'community','newsletter','authentication','account','premium','stripe','paypal','push','pwa','offline',
  'ai','recommendations','pro_api','gamification','reports','scanner','local_analysis','demo_fixtures',
];

function fail(message) { failures.push(message); }
function valueAt(object, dottedPath) {
  return dottedPath.split('.').reduce((value, key) => value?.[key], object);
}
function readRequiredString(contract, dottedPath) {
  const value = valueAt(contract, dottedPath);
  if (typeof value !== 'string' || value.trim() === '') {
    fail(`${dottedPath} must be a non-empty string`);
    return null;
  }
  return value;
}
function readUrl(contract, dottedPath, protocols) {
  const value = readRequiredString(contract, dottedPath);
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!protocols.includes(url.protocol)) fail(`${dottedPath} uses unsupported protocol ${url.protocol}`);
    return url;
  } catch (error) {
    fail(`${dottedPath} is not a valid URL: ${error.message}`);
    return null;
  }
}
function requireRootPath(contract, dottedPath) {
  const value = readRequiredString(contract, dottedPath);
  if (value && !value.startsWith('/')) fail(`${dottedPath} must start with /`);
}
function requireRelativeAssetPath(contract, dottedPath) {
  const value = readRequiredString(contract, dottedPath);
  if (value && (value.startsWith('/') || value.includes('://'))) fail(`${dottedPath} must be a relative asset path`);
}

if (!fs.existsSync(contractPath)) fail('config/runtime-contract.json is missing');
let contract = null;
if (!failures.length) {
  try { contract = JSON.parse(fs.readFileSync(contractPath, 'utf8')); }
  catch (error) { fail(`config/runtime-contract.json is invalid JSON: ${error.message}`); }
}

if (contract) {
  if (contract.schema_version !== 1) fail('schema_version must equal 1');
  readRequiredString(contract, 'application.name');
  readRequiredString(contract, 'application.tagline');
  readRequiredString(contract, 'application.description');
  const frontendVersion = readRequiredString(contract, 'application.frontend_version');
  if (frontendVersion && !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(frontendVersion)) {
    fail('application.frontend_version must be a valid semantic version');
  }
  const publicUrl = readUrl(contract, 'application.public_base_url', ['http:', 'https:']);
  const backendUrl = readUrl(contract, 'backend.api_base_url', ['http:', 'https:']);
  if (publicUrl?.username || publicUrl?.password) fail('application.public_base_url must not contain credentials');
  if (backendUrl?.username || backendUrl?.password) fail('backend.api_base_url must not contain credentials');
  requireRootPath(contract, 'backend.health_path');
  requireRootPath(contract, 'pwa.manifest_path');
  requireRootPath(contract, 'pwa.service_worker_path');
  readRequiredString(contract, 'pwa.cache_version');
  requireRelativeAssetPath(contract, 'runtime.enhancements_script');
  const environment = readRequiredString(contract, 'runtime.environment');
  if (environment && !['production', 'demo'].includes(environment)) fail('runtime.environment must be production or demo');

  const capabilities = contract.application?.capabilities;
  if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) {
    fail('application.capabilities must be an object');
  } else {
    const actualKeys = Object.keys(capabilities).sort();
    const expectedKeys = [...expectedCapabilities].sort();
    if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
      fail(`application.capabilities must contain exactly: ${expectedCapabilities.join(', ')}`);
    }
    for (const [name, definition] of Object.entries(capabilities)) {
      if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
        fail(`application.capabilities.${name} must be an object`);
        continue;
      }
      if (Object.keys(definition).length !== 1 || !Object.hasOwn(definition, 'status')) {
        fail(`application.capabilities.${name} must contain only status`);
      }
      if (!allowedStatuses.has(definition.status)) {
        fail(`application.capabilities.${name}.status is invalid: ${definition.status}`);
      }
    }
  }
}

if (failures.length) {
  console.error('Runtime contract verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Runtime contract verification passed.');
