const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('generated runtime config is deeply frozen and globally non-reconfigurable', () => {
  const sandbox = { globalThis: {} };
  sandbox.window = sandbox.globalThis;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../runtime-config.js'), 'utf8'), sandbox);
  const runtime = sandbox.globalThis.JULVOX_RUNTIME_CONFIG;
  const descriptor = Object.getOwnPropertyDescriptor(sandbox.globalThis, 'JULVOX_RUNTIME_CONFIG');
  assert.deepEqual({ writable: descriptor.writable, configurable: descriptor.configurable, enumerable: descriptor.enumerable }, { writable: false, configurable: false, enumerable: true });
  assert.equal(Object.isFrozen(runtime), true);
  assert.equal(Object.isFrozen(runtime.application.capabilities.scanner), true);
  const before = runtime.backend.apiBaseUrl;
  assert.throws(() => vm.runInContext(`'use strict'; globalThis.JULVOX_RUNTIME_CONFIG.backend.apiBaseUrl = 'https://evil.invalid'`, sandbox), /read only|Cannot assign/i);
  assert.equal(runtime.backend.apiBaseUrl, before);
});
