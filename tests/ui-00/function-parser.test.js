const test = require('node:test');
const assert = require('node:assert/strict');
const { replaceNamedFunction } = require('../../scripts/ui00-transforms/function-spans.js');

test('function parser returns from nested template interpolations', () => {
  const source = 'function loadDynamicFlashDeals(){ return `<a>${true ? `<div>${1}</div>` : ""}</a>`; }\nfunction neighbor(){ return true; }';
  const replaced = replaceNamedFunction(
    source,
    'loadDynamicFlashDeals',
    'async function loadDynamicFlashDeals(){ return []; }',
  );
  assert.match(replaced, /async function loadDynamicFlashDeals\(\)\{ return \[\]; \}/);
  assert.match(replaced, /function neighbor\(\)/);
  assert.doesNotMatch(replaced, /<div>/);
});

test('function parser removes object-literal defaults without corrupting following code', () => {
  const source = `async function fetchWithTimeout(url, options = {}, timeout = 8000) {
    return { url, options, timeout };
  }
  function neighbor(){ return true; }`;
  const replaced = replaceNamedFunction(source, 'fetchWithTimeout', '');
  assert.doesNotMatch(replaced, /fetchWithTimeout|timeout = 8000/);
  assert.match(replaced, /function neighbor\(\)/);
  assert.doesNotThrow(() => new Function(replaced));
});

test('function parser supports nested defaults, comments and regex literals', () => {
  const source = `function target(a = { fn: (x) => ({ x }) }, b = /[(){}]/g /* { } */) // body follows
  { return a; }
  function neighbor(){ return true; }`;
  const replaced = replaceNamedFunction(source, 'target', '');
  assert.match(replaced, /function neighbor\(\)/);
  assert.doesNotThrow(() => new Function(replaced));
});
