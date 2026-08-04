const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
const failures = [];
const allowed = new Set(['supported', 'partial', 'experimental', 'unavailable', 'demo-only']);
function fail(message) { failures.push(message); }
function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) { fail(`${label} is missing`); return null; }
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (error) { fail(`${label} is invalid JSON: ${error.message}`); return null; }
}
const contract = readJson(path.join(root, 'config', 'runtime-contract.json'), 'config/runtime-contract.json');
const expected = contract?.application?.capabilities;
if (!expected || typeof expected !== 'object' || Array.isArray(expected)) fail('application.capabilities must be an object');
else {
  for (const [name, definition] of Object.entries(expected)) {
    if (!definition || !allowed.has(definition.status)) fail(`invalid capability status for ${name}`);
  }
}
const distConfigPath = path.join(root, 'dist', 'runtime-config.js');
let actual = null;
if (!fs.existsSync(distConfigPath)) fail('dist/runtime-config.js is missing');
else {
  const sandbox = { globalThis: {} };
  sandbox.window = sandbox.globalThis;
  vm.createContext(sandbox);
  try {
    vm.runInContext(fs.readFileSync(distConfigPath, 'utf8'), sandbox, { filename: 'dist/runtime-config.js' });
    actual = sandbox.globalThis.JULVOX_RUNTIME_CONFIG?.application?.capabilities;
  } catch (error) { fail(`dist/runtime-config.js cannot execute: ${error.message}`); }
}
if (actual && JSON.stringify(actual) !== JSON.stringify(expected)) fail('built capabilities differ from runtime contract');
if (actual && !Object.isFrozen(actual)) fail('built capabilities are not frozen');
if (actual) {
  for (const [name, definition] of Object.entries(actual)) {
    if (!Object.isFrozen(definition)) fail(`built capability ${name} is not frozen`);
  }
}
if (failures.length) {
  console.error('Application capabilities verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Application capabilities verification passed.');
