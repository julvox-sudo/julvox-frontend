const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { applyProductionTruth } = require('../../scripts/apply-ui-00-production-truth.js');
const { ensureMobileSearchFeedback } = require('../../scripts/ui00-transforms/ensure-mobile-search-feedback.js');

const repoRoot = path.resolve(__dirname, '../..');
const sourceHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
const sourceEnhancements = fs.readFileSync(path.join(repoRoot, 'enhancements_v3.js'), 'utf8');
const transformed = applyProductionTruth({ html: sourceHtml, enhancements: sourceEnhancements }).html;

const SEARCH_START = '// ── SEARCH ────────────────────────────────────────────────────';
const SEARCH_END = '// ── FAVORITES ─────────────────────────────────────────────────';

function extractSearchRuntime(html) {
  const start = html.indexOf(SEARCH_START);
  const end = html.indexOf(SEARCH_END, start);
  assert.notEqual(start, -1, 'search runtime start marker is missing');
  assert.notEqual(end, -1, 'search runtime end marker is missing');
  return html.slice(start, end);
}

function createRuntime(deals = []) {
  const elements = {
    dealCount: { textContent: '' },
    dealsGrid: { innerHTML: '' },
    searchStatus: { textContent: '' },
  };
  const renders = [];
  const states = [];
  const loads = [];
  const timers = new Map();
  let timerId = 0;

  const context = {
    __deals: deals,
    document: {
      getElementById(id) { return elements[id] || null; },
    },
    window: {
      JULVOX_PRODUCTION_TRUTH: {
        renderState(element, kind, message, retry) {
          states.push({ element, kind, message, retry });
        },
      },
    },
    renderDeals(value) { renders.push(value); },
    loadDeals(cat, score) { loads.push({ cat, score }); },
    setTimeout(callback) {
      timerId += 1;
      timers.set(timerId, callback);
      return timerId;
    },
    clearTimeout(id) { timers.delete(id); },
  };
  context.globalThis = context;

  vm.runInNewContext(`
    let allDeals = globalThis.__deals;
    let currentCat = '';
    let minScore = 0;
    ${extractSearchRuntime(transformed)}
  `, context);

  return {
    context,
    elements,
    renders,
    states,
    loads,
    timers,
    flush() {
      const callbacks = [...timers.values()];
      timers.clear();
      callbacks.forEach(callback => callback());
    },
  };
}

test('leaves unrelated build fixtures unchanged and fails closed on a partial search runtime', () => {
  const unrelated = '<!doctype html><html><body><div>fixture</div></body></html>';
  assert.equal(ensureMobileSearchFeedback(unrelated), unrelated);
  assert.throws(
    () => ensureMobileSearchFeedback(`${SEARCH_START}\nfunction handleSearch(){}`),
    /expected one search container, found 0/,
  );
});

test('keeps the mobile search focusable and associates an observable live status', () => {
  const input = transformed.match(/<input[^>]+id="searchInput"[^>]*>/)?.[0] || '';
  assert.match(input, /oninput="handleSearch\(this\.value\)"/);
  assert.match(input, /aria-controls="dealsGrid"/);
  assert.match(input, /aria-describedby="searchStatus"/);
  assert.match(input, /enterkeyhint="search"/);
  assert.doesNotMatch(input, /\bdisabled\b|aria-disabled="true"/);
  assert.match(transformed, /id="searchStatus"[^>]+role="status"[^>]+aria-live="polite"/);
});

test('propagates Casque immediately, then filters the loaded verified deals', () => {
  const runtime = createRuntime([
    { id: 1, name: 'Casque audio', store: 'Fnac', brand: 'Audio', category: 'high-tech' },
    { id: 2, name: 'Clavier', store: 'Amazon', brand: 'Keys', category: 'high-tech' },
  ]);

  runtime.context.handleSearch('Casque');
  assert.equal(runtime.elements.searchStatus.textContent, 'Recherche de « Casque »…');
  assert.equal(runtime.timers.size, 1);

  runtime.flush();
  assert.equal(runtime.renders.length, 1);
  assert.equal(runtime.renders[0].length, 1);
  assert.equal(runtime.renders[0][0].name, 'Casque audio');
  assert.equal(runtime.elements.dealCount.textContent, '1 résultat');
  assert.equal(runtime.elements.searchStatus.textContent, '1 résultat pour « Casque ».');
  assert.equal(runtime.states.length, 0);
});

test('renders an honest query-specific empty result without simulated data', () => {
  const runtime = createRuntime([
    { id: 2, name: 'Clavier', store: 'Amazon', brand: 'Keys', category: 'high-tech' },
  ]);

  runtime.context.handleSearch('Casque');
  runtime.flush();

  assert.equal(runtime.renders.length, 0);
  assert.equal(runtime.states.length, 1);
  assert.equal(runtime.states[0].kind, 'empty');
  assert.equal(runtime.states[0].message, 'Aucun résultat vérifié pour « Casque ».');
  assert.equal(runtime.states[0].retry, undefined);
  assert.equal(runtime.elements.dealCount.textContent, '0 résultat');
  assert.equal(runtime.elements.searchStatus.textContent, 'Aucun résultat vérifié pour « Casque ».');
});

test('reports honestly when no verified offers are loaded and preserves retry', () => {
  const runtime = createRuntime([]);

  runtime.context.handleSearch('Casque');
  runtime.flush();

  assert.equal(runtime.renders.length, 0);
  assert.equal(runtime.states.length, 1);
  assert.equal(runtime.states[0].kind, 'empty');
  assert.equal(runtime.states[0].message, 'Aucune offre chargée à rechercher pour « Casque ».');
  assert.equal(typeof runtime.states[0].retry, 'function');
  assert.equal(runtime.loads.length, 0);
  runtime.states[0].retry();
  assert.deepEqual(runtime.loads, [{ cat: '', score: 0 }]);
  assert.equal(runtime.elements.dealCount.textContent, '0 résultat');
  assert.equal(runtime.elements.searchStatus.textContent, 'Aucune offre chargée à rechercher pour « Casque ».');
});

test('debounces repeated mobile input without a rendering loop or silent exception', () => {
  const runtime = createRuntime([{ id: 1, name: 'Casque', store: 'Fnac' }]);

  assert.doesNotThrow(() => {
    runtime.context.handleSearch('C');
    runtime.context.handleSearch('Ca');
    runtime.context.handleSearch('Casque');
  });
  assert.equal(runtime.timers.size, 1);
  runtime.flush();
  assert.equal(runtime.timers.size, 0);
  assert.equal(runtime.renders.length, 1);

  assert.doesNotThrow(() => {
    runtime.context.handleSearch(null);
    runtime.flush();
  });
  assert.equal(runtime.timers.size, 0);
});
