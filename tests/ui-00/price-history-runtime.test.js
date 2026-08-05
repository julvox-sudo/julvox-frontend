const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {
  PRICE_HISTORY_MARKER,
  DISABLED_BLOCK_END,
  activatePriceHistoryRuntime,
} = require('../../scripts/ui00-transforms/activate-price-history-runtime.js');

function disabledRuntime() {
  return `
function openDeal() { _loadAndRenderPriceChart(); }
/* deferred features
function deferredWishlist() { globalThis.deferredEnabled = true; }
${PRICE_HISTORY_MARKER}
async function _loadAndRenderPriceChart() { globalThis.historyCalled = true; }
${DISABLED_BLOCK_END}
function afterBlock() { return true; }
`;
}

test('activates only the price-history tail of the deferred block', async () => {
  const output = activatePriceHistoryRuntime(disabledRuntime());
  const context = { historyCalled: false, deferredEnabled: false };
  vm.runInNewContext(`${output}\nopenDeal();`, context);
  await Promise.resolve();
  assert.equal(context.historyCalled, true);
  assert.equal(context.deferredEnabled, false);
  assert.equal(vm.runInNewContext('typeof deferredWishlist', context), 'undefined');
  assert.equal(vm.runInNewContext('typeof _loadAndRenderPriceChart', context), 'function');
  assert.doesNotMatch(output, new RegExp(`${PRICE_HISTORY_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*${DISABLED_BLOCK_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
});

test('is idempotent and leaves unrelated fixtures unchanged', () => {
  const output = activatePriceHistoryRuntime(disabledRuntime());
  assert.equal(activatePriceHistoryRuntime(output), output);
  assert.equal(activatePriceHistoryRuntime('function other() { return true; }'), 'function other() { return true; }');
});

test('fails closed when the price-history boundary is ambiguous', () => {
  assert.throws(
    () => activatePriceHistoryRuntime(`${PRICE_HISTORY_MARKER}\n${PRICE_HISTORY_MARKER}\n${DISABLED_BLOCK_END}`),
    /expected one history marker, found 2/,
  );
  assert.throws(
    () => activatePriceHistoryRuntime(`/* deferred\n${PRICE_HISTORY_MARKER}\nfunction _loadAndRenderPriceChart(){}`),
    /disabled block terminator is missing/,
  );
});
