const test = require('node:test');
const assert = require('node:assert/strict');
const { runConfirmedMutation, isConfirmedServerResult } = require('../../ui-00-production-truth.js');

test('does not confirm before the server result', async () => {
  const events = [];
  let resolveOperation;
  const operation = new Promise(resolve => { resolveOperation = resolve; });
  const pending = runConfirmedMutation({
    operation: () => operation,
    onPending: () => events.push('pending'),
    onSuccess: () => events.push('success'),
  });
  assert.deepEqual(events, ['pending']);
  resolveOperation({ ok: true, kind: 'success', status: 200, data: { id: 1 } });
  await pending;
  assert.deepEqual(events, ['pending', 'success']);
});

test('server error triggers rollback and no success', async () => {
  const events = [];
  await runConfirmedMutation({
    operation: async () => ({ ok: false, kind: 'http-error', status: 500, message: 'Service indisponible' }),
    onPending: () => events.push('pending'),
    onSuccess: () => events.push('success'),
    rollback: () => events.push('rollback'),
    onError: () => events.push('error'),
  });
  assert.deepEqual(events, ['pending', 'rollback', 'error']);
});

test('network exception triggers rollback and honest error', async () => {
  const events = [];
  const result = await runConfirmedMutation({
    operation: async () => { throw new Error('network'); },
    rollback: () => events.push('rollback'),
    onError: value => events.push(value.kind),
  });
  assert.equal(result.ok, false);
  assert.deepEqual(events, ['rollback', 'network-error']);
});

test('an unnormalized ok flag cannot trigger business success', async () => {
  const events = [];
  await runConfirmedMutation({
    operation: async () => ({ ok: true }),
    onSuccess: () => events.push('success'),
    rollback: () => events.push('rollback'),
    onError: () => events.push('error'),
  });
  assert.deepEqual(events, ['rollback', 'error']);
  assert.equal(isConfirmedServerResult({ ok: true, kind: 'success', status: 200 }), true);
  assert.equal(isConfirmedServerResult({ ok: true, kind: 'success', status: 0 }), false);
});
