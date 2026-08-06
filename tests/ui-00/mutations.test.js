const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../../scripts/ui00-mutation-installer.js'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, '../../ui-00-production-truth.js'), 'utf8');

function loadTruth(overrides = {}) {
  const context = {
    console,
    module: { exports: {} }, exports: {},
    JULVOX_RUNTIME_CONFIG: { application: { capabilities: {} }, runtime: { environment: 'production' } },
    JULVOX_API: overrides.api || {},
    currentUser: overrides.currentUser || { token: 'jwt' },
    localStorage: { getItem: () => 'jwt' },
    document: overrides.document || { readyState: 'complete', body: {}, querySelectorAll: () => [], getElementById: () => null, querySelector: () => null },
    MutationObserver: class { observe() {} },
    showToast: overrides.showToast || (() => {}),
    ...overrides.globals,
  };
  context.window = context;
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: 'ui-00-production-truth.js' });
  return { context, mod: context.module.exports };
}

test('does not confirm before the server result and rolls back an error', async () => {
  const { mod } = loadTruth();
  const events = [];
  let resolveOperation;
  const pending = mod.runConfirmedMutation({
    operation: () => new Promise(resolve => { resolveOperation = resolve; }),
    onPending: () => events.push('pending'),
    onSuccess: () => events.push('success'),
    rollback: () => events.push('rollback'),
    onError: () => events.push('error'),
  });
  assert.deepEqual(events, ['pending']);
  resolveOperation({ ok: false, kind: 'http-error', status: 500 });
  await pending;
  assert.deepEqual(events, ['pending', 'rollback', 'error']);
});

test('withMutationLock refuses a duplicate and releases after completion', async () => {
  const { mod } = loadTruth();
  let resolve;
  let calls = 0;
  const first = mod.withMutationLock('same', async () => { calls += 1; await new Promise(done => { resolve = done; }); return 'ok'; });
  const duplicate = await mod.withMutationLock('same', async () => { calls += 1; });
  assert.equal(duplicate.duplicate, true);
  assert.equal(calls, 1);
  resolve();
  assert.equal(await first, 'ok');
  assert.equal(await mod.withMutationLock('same', async () => { calls += 1; return 'again'; }), 'again');
  assert.equal(calls, 2);
});

test('double createAlert sends one request and no success before confirmation', async () => {
  let resolve;
  let calls = 0;
  const toasts = [];
  const { context } = loadTruth({
    api: {
      post: async () => { calls += 1; return new Promise(done => { resolve = done; }); },
    },
    showToast: message => toasts.push(message),
  });
  const first = context.createAlert('Produit', 10);
  const second = await context.createAlert('Produit', 10);
  assert.equal(calls, 1);
  assert.equal(second.duplicate, true);
  assert.equal(toasts.some(message => /Alerte créée/.test(message)), false);
  resolve({ ok: true, kind: 'success', status: 201, data: { alert_id: 7 } });
  await first;
  assert.equal(toasts.some(message => /Alerte créée/.test(message)), true);
});

test('account deletion failure preserves session and 204 confirmation logs out once', async () => {
  let logout = 0;
  const toasts = [];
  const responses = [
    { ok: false, kind: 'http-error', status: 500, message: 'Service indisponible.' },
    { ok: true, kind: 'empty', status: 204, data: null },
  ];
  const { context } = loadTruth({
    api: { delete: async () => responses.shift() },
    showToast: value => toasts.push(value),
    globals: { logout: () => { logout += 1; }, closePage: () => {} },
  });
  await context.deleteAccount();
  assert.equal(logout, 0);
  await context.deleteAccount();
  assert.equal(logout, 1);
  assert.equal(toasts.some(message => /Demande de suppression enregistrée/.test(message)), true);
});

test('incomplete vote counters cannot update the UI', async () => {
  let updates = 0;
  const { context } = loadTruth({
    api: { post: async (_path, _body, options) => ({
      ok: options.confirm({ up: 10, my_vote: 'up' }) && true,
      kind: 'success', status: 200, data: { up: 10, my_vote: 'up' },
    }) },
    globals: { updateVoteUI: () => { updates += 1; }, openAuth: () => {} },
  });
  await context.voteDeal(1, 'up');
  assert.equal(updates, 0);
});
