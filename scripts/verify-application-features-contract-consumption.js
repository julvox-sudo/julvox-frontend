const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
const contractPath = path.join(root, 'config', 'runtime-contract.json');
const distConfigPath = path.join(root, 'dist', 'runtime-config.js');
const failures = [];

function fail(message) {
  failures.push(message);
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    fail(`${label} is missing`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`${label} is invalid JSON: ${error.message}`);
    return null;
  }
}

const contract = readJson(contractPath, 'config/runtime-contract.json');
let expectedFeatures = null;

if (contract) {
  expectedFeatures = contract.application?.features;
  if (!expectedFeatures || typeof expectedFeatures !== 'object' || Array.isArray(expectedFeatures)) {
    fail('application.features must be an object');
  } else {
    const entries = Object.entries(expectedFeatures);
    if (entries.length === 0) fail('application.features must not be empty');
    for (const [name, enabled] of entries) {
      if (!/^[a-z][a-z0-9_]*$/.test(name)) fail(`invalid application feature name: ${name}`);
      if (typeof enabled !== 'boolean') fail(`application.features.${name} must be boolean`);
    }
  }
}

if (!fs.existsSync(distConfigPath)) {
  fail('dist/runtime-config.js is missing');
} else {
  const source = fs.readFileSync(distConfigPath, 'utf8');
  const sandbox = { globalThis: {} };
  sandbox.window = sandbox.globalThis;
  vm.createContext(sandbox);

  try {
    vm.runInContext(source, sandbox, { filename: 'dist/runtime-config.js' });
    const actual = sandbox.globalThis.JULVOX_RUNTIME_CONFIG;
    if (!actual) {
      fail('dist/runtime-config.js does not expose JULVOX_RUNTIME_CONFIG');
    } else {
      if (JSON.stringify(actual.application?.features) !== JSON.stringify(expectedFeatures)) {
        fail('built application features differ from the runtime contract');
      }
      if (!Object.isFrozen(actual.application?.features)) {
        fail('built application features are not immutable');
      }
    }
  } catch (error) {
    fail(`dist/runtime-config.js cannot execute: ${error.message}`);
  }
}

if (failures.length > 0) {
  console.error('Application feature contract verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Application feature contract verification passed.');
