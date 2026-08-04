const test = require('node:test');
const assert = require('node:assert/strict');

function loadModule(runtime) {
  Object.defineProperty(globalThis, 'JULVOX_RUNTIME_CONFIG', { value: runtime, configurable: true, writable: true });
  delete require.cache[require.resolve('../../ui-00-production-truth.js')];
  return require('../../ui-00-production-truth.js');
}
const capabilities = {
  supported_feature: { status: 'supported' },
  partial_feature: { status: 'partial' },
  experimental_feature: { status: 'experimental' },
  unavailable_feature: { status: 'unavailable' },
  demo_feature: { status: 'demo-only' },
};

test('supported capability is available', () => {
  const mod = loadModule({ application: { capabilities }, runtime: { environment: 'production' } });
  assert.equal(mod.getCapabilityStatus('supported_feature'), 'supported');
  assert.equal(mod.isCapabilityAvailable('supported_feature'), true);
});
test('partial and experimental capabilities remain qualified', () => {
  const mod = loadModule({ application: { capabilities }, runtime: { environment: 'production' } });
  assert.equal(mod.getCapabilityStatus('partial_feature'), 'partial');
  assert.equal(mod.getCapabilityStatus('experimental_feature'), 'experimental');
});
test('unavailable capability is not available', () => {
  const mod = loadModule({ application: { capabilities }, runtime: { environment: 'production' } });
  assert.equal(mod.isCapabilityAvailable('unavailable_feature'), false);
});
test('demo-only is inaccessible in production', () => {
  const mod = loadModule({ application: { capabilities }, runtime: { environment: 'production' } });
  assert.equal(mod.isCapabilityAvailable('demo_feature'), false);
});
test('demo-only is available only in explicit demo environment', () => {
  const mod = loadModule({ application: { capabilities }, runtime: { environment: 'demo' } });
  assert.equal(mod.isCapabilityAvailable('demo_feature'), true);
});
test('unknown capability fails closed', () => {
  const mod = loadModule({ application: { capabilities }, runtime: { environment: 'production' } });
  assert.equal(mod.getCapabilityStatus('unknown'), 'unavailable');
  assert.equal(mod.isCapabilityAvailable('unknown'), false);
});
