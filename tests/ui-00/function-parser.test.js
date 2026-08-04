const test = require('node:test');
const assert = require('node:assert/strict');
const { replaceNamedFunction } = require('../../scripts/apply-ui-00-production-truth.js');

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
