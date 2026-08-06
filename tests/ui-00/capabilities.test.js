const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../../scripts/ui00-mutation-installer.js'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, '../../ui-00-production-truth.js'), 'utf8');

function elementStub() {
  const badges = [];
  const ownerDocument = {
    createElement() {
      return {
        dataset: {}, style: {}, textContent: '', ownerDocument,
        setAttribute() {}, appendChild(child) { badges.push(child); },
        querySelector() { return null; },
      };
    },
  };
  return {
    dataset: {}, hidden: false, disabled: false, ownerDocument, badges,
    style: {},
    setAttribute(name, value) { this[name] = value; },
    removeAttribute(name) { delete this[name]; },
    querySelector(selector) { return selector.includes('page-title') ? this : null; },
    querySelectorAll(selector) { return selector.includes('capability-badge') ? badges : []; },
    appendChild(child) { badges.push(child); },
  };
}

function loadTruth(runtime, overrides = {}) {
  const elementsBySelector = overrides.elementsBySelector || {};
  const context = {
    console,
    module: { exports: {} }, exports: {},
    JULVOX_RUNTIME_CONFIG: runtime,
    JULVOX_API: overrides.api || {},
    currentUser: overrides.currentUser,
    localStorage: overrides.localStorage || { getItem: () => null },
    showToast: overrides.showToast || (() => {}),
    document: overrides.document || {
      readyState: 'complete', body: {},
      querySelectorAll(selector) { return elementsBySelector[selector] || []; },
      getElementById: () => null,
    },
    MutationObserver: class { observe() {} },
    ...overrides.globals,
  };
  context.window = context;
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: 'ui-00-production-truth.js' });
  return { context, mod: context.module.exports };
}

const definitions = {
  supported_feature: { status: 'supported' },
  partial_feature: { status: 'partial' },
  experimental_feature: { status: 'experimental' },
  unavailable_feature: { status: 'unavailable' },
  demo_feature: { status: 'demo-only' },
};
const runtime = environment => ({ application: { capabilities: definitions }, runtime: { environment } });

test('all five statuses are closed and unknown values fail unavailable', () => {
  const { mod } = loadTruth(runtime('production'));
  assert.equal(mod.getCapabilityStatus('supported_feature'), 'supported');
  assert.equal(mod.getCapabilityStatus('partial_feature'), 'partial');
  assert.equal(mod.getCapabilityStatus('experimental_feature'), 'experimental');
  assert.equal(mod.getCapabilityStatus('unavailable_feature'), 'unavailable');
  assert.equal(mod.getCapabilityStatus('demo_feature'), 'demo-only');
  assert.equal(mod.getCapabilityStatus('unknown'), 'unavailable');
  assert.equal(mod.isCapabilityAvailable('unknown'), false);
});

test('demo-only cannot be forced in production by URL or localStorage', () => {
  const { mod } = loadTruth(runtime('production'), {
    localStorage: { getItem: () => 'demo' },
    globals: { location: { search: '?demo=1' } },
  });
  assert.equal(mod.isDemoMode(), false);
  assert.equal(mod.isCapabilityAvailable('demo_feature'), false);
  const demo = loadTruth(runtime('demo')).mod;
  assert.equal(demo.isCapabilityAvailable('demo_feature'), true);
});

test('partial and experimental surfaces receive a visible qualification badge', () => {
  const { mod } = loadTruth(runtime('production'));
  const partial = elementStub();
  const experimental = elementStub();
  mod.applyCapabilityState(partial, 'partial_feature');
  mod.applyCapabilityState(experimental, 'experimental_feature');
  assert.equal(partial.hidden, false);
  assert.equal(partial['data-capability-label'], 'Disponibilité partielle');
  assert.equal(partial.badges[0].textContent, 'Disponibilité partielle');
  assert.equal(experimental.badges[0].textContent, 'Expérimental');
});

test('unavailable and production demo-only surfaces are hidden and disabled', () => {
  const { mod } = loadTruth(runtime('production'));
  for (const name of ['unavailable_feature', 'demo_feature']) {
    const element = elementStub();
    mod.applyCapabilityState(element, name);
    assert.equal(element.hidden, true);
    assert.equal(element.disabled, true);
    assert.equal(element['aria-hidden'], 'true');
  }
});

test('an unavailable scanner global entrypoint is behaviorally blocked', () => {
  let called = 0;
  const scannerButton = elementStub();
  const scannerRuntime = {
    application: { capabilities: { scanner: { status: 'unavailable' } } },
    runtime: { environment: 'production' },
  };
  const { context, mod } = loadTruth(scannerRuntime, {
    elementsBySelector: { '[onclick*="startScanner"]': [scannerButton] },
    globals: { startScanner: () => { called += 1; } },
  });
  mod.install();
  assert.equal(context.startScanner(), false);
  assert.equal(called, 0);
  assert.equal(scannerButton.hidden, true);
});
