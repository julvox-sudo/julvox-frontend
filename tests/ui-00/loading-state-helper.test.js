const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { ensureLoadingStateHelper } = require('../../scripts/ui00-transforms/ensure-loading-state-helper.js');

test('injects an honest loading state before loadDeals and remains parseable', () => {
  const source = "async function loadDeals(cat, minSc) { showLoadingDeals(); return [cat, minSc]; }";
  const output = ensureLoadingStateHelper(source);
  assert.match(output, /function showLoadingDeals\(\)/);
  assert.match(output, /state\.dataset\.ui00State = 'loading'/);
  assert.match(output, /Vérification des offres réelles/);
  assert.doesNotMatch(output, /demo|simul|fake|fixture/i);
  assert.doesNotThrow(() => new vm.Script(output));
  assert.equal(ensureLoadingStateHelper(output), output);
});

test('loading helper renders one accessible status without product data', () => {
  const appended = [];
  const grid = { replaceChildren(node) { appended.splice(0, appended.length, node); } };
  const context = {
    document: {
      getElementById(id) { return id === 'dealsGrid' ? grid : null; },
      createElement() {
        return { dataset: {}, style: {}, attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
      },
    },
  };
  vm.runInNewContext(`${ensureLoadingStateHelper("async function loadDeals(cat, minSc) { showLoadingDeals(); return [cat, minSc]; }")}\nshowLoadingDeals();`, context);
  assert.equal(appended.length, 1);
  assert.equal(appended[0].dataset.ui00State, 'loading');
  assert.equal(appended[0].attributes.role, 'status');
  assert.equal(appended[0].attributes['aria-live'], 'polite');
  assert.equal(appended[0].textContent, 'Vérification des offres réelles...');
});

test('leaves unrelated transform fixtures unchanged', () => {
  const source = 'function other() { return true; }';
  assert.equal(ensureLoadingStateHelper(source), source);
});

test('fails closed when a loading call has no unique loadDeals anchor', () => {
  assert.throws(() => ensureLoadingStateHelper('function other() { showLoadingDeals(); }'), /for 1 call\(s\), found 0/);
  assert.throws(() => ensureLoadingStateHelper('async function loadDeals(cat, minSc) { showLoadingDeals(); }\nasync function loadDeals(cat, minSc) {}'), /for 1 call\(s\), found 2/);
});
