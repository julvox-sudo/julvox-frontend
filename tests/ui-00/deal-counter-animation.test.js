const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {
  UNSAFE_COUNTER_ANCHOR,
  SAFE_COUNTER_ANCHOR,
  ensureDealCounterGuard,
} = require('../../scripts/ui00-transforms/ensure-deal-counter-guard.js');

function counterFunction(anchor) {
  return `function animateDealCounter(targetEl, targetValue) {
  if (!targetEl) return;
${anchor}
  const startTime = performance.now();
  function update(time) {
    const progress = Math.min((time - startTime) / duration, 1);
    const current = Math.round(start + (targetValue - start) * progress);
    targetEl.textContent = String(current);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}`;
}

test('observer feedback does not schedule another counter animation for the same value', () => {
  const guarded = ensureDealCounterGuard(counterFunction(UNSAFE_COUNTER_ANCHOR));
  let scheduled = 0;
  const context = {
    target: { textContent: '1' },
    requestAnimationFrame() { scheduled += 1; },
    performance: { now: () => 0 },
  };
  vm.runInNewContext(`${guarded}\nanimateDealCounter(target, 1);`, context);
  assert.equal(scheduled, 0);
  assert.match(guarded, /if \(start === targetValue\) return;/);
});

test('a genuine value change still schedules the original animation', () => {
  const guarded = ensureDealCounterGuard(counterFunction(UNSAFE_COUNTER_ANCHOR));
  let scheduled = 0;
  const context = {
    target: { textContent: '0' },
    requestAnimationFrame() { scheduled += 1; },
    performance: { now: () => 0 },
  };
  vm.runInNewContext(`${guarded}\nanimateDealCounter(target, 2);`, context);
  assert.equal(scheduled, 1);
  assert.equal(ensureDealCounterGuard(guarded), guarded);
});

test('unrelated fixtures are unchanged and ambiguous counters fail closed', () => {
  const unrelated = 'function other() { return true; }';
  assert.equal(ensureDealCounterGuard(unrelated), unrelated);
  assert.throws(
    () => ensureDealCounterGuard(`${counterFunction(UNSAFE_COUNTER_ANCHOR)}\n${counterFunction(UNSAFE_COUNTER_ANCHOR)}`),
    /function=2, unsafe=2, safe=0/,
  );
  assert.equal(SAFE_COUNTER_ANCHOR.includes('start === targetValue'), true);
});
