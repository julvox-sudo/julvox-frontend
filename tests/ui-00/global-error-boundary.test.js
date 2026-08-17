const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { ensureGlobalErrorBoundary, MARKER } = require('../../scripts/ui00-transforms/ensure-global-error-boundary');

test('global error boundary is injected into head and is idempotent', () => {
  const input = '<!doctype html><html><head></head><body></body></html>';
  const once = ensureGlobalErrorBoundary(input);
  const twice = ensureGlobalErrorBoundary(once);
  assert.equal(once, twice);
  assert.match(once, new RegExp(`id="${MARKER}"`));
  assert.ok(once.indexOf(MARKER) < once.indexOf('</head>'));
  assert.match(once, /unhandledrejection/);
  assert.match(once, /addEventListener\('error'/);
});

test('global boundary exposes only a generic user-safe message', () => {
  const output = ensureGlobalErrorBoundary('<html><head></head><body></body></html>');
  const source = output.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
  assert.equal(source.includes('event.message'), false);
  assert.equal(source.includes('event.reason'), false);
  assert.match(source, /Julvox a rencontré un problème/);
  assert.match(source, /Recharge la page/);
});

test('boundary runtime installs both listeners without preventing browser diagnostics', () => {
  const output = ensureGlobalErrorBoundary('<html><head></head><body></body></html>');
  const source = output.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
  const listeners = {};
  const document = {
    body: { appendChild() {} },
    createElement() {
      return {
        setAttribute() {},
        querySelector() { return { addEventListener() {} }; },
        style: {},
      };
    },
    getElementById() { return null; },
    addEventListener() {},
  };
  const context = {
    document,
    location: { reload() {} },
    window: { addEventListener(name, handler) { listeners[name] = handler; } },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  assert.equal(typeof listeners.error, 'function');
  assert.equal(typeof listeners.unhandledrejection, 'function');
  assert.equal(source.includes('preventDefault'), false);
});