'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { RUNTIME_BLOCK, hardenHtml } = require('../../scripts/reconcile-swipe-runtime-actions');

const fixture = [
  '<html><body>',
  '<button onclick="swipeCard(\'left\')">Passer</button>',
  '<button onclick="openDealFromSwipe()">Détails</button>',
  '<button onclick="swipeCard(\'right\')">Sauvegarder</button>',
  '<div id="swipeProgress"></div>',
  '<script>',
  "if (openTarget === 'swipe')    openSwipePage();",
  "const swipePath = '/deals/feed/swipe?limit=20';",
  'function addToFav(id, silent) { return [id, silent]; }',
  'function renderSwipeStack() { initSwipeDrag(card, deal); updateSwipeProgress(); }',
  'P6_41_FAVORITES_LOCAL_TRUTH; P6_79_SWIPE_REFERENCE_GAP_TRUTH; P6_80_BUDGET_SELECTION_COPY_TRUTH;',
  '</script>',
  "// ── Résolution intelligente d'image produit ─────────────────",
  '</body></html>',
].join('\n');

test('P6.81 runtime block is valid JavaScript', () => {
  assert.doesNotThrow(() => new Function(RUNTIME_BLOCK));
});

test('P6.81 restores every missing Swipe helper exactly once', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  for (const definition of [
    'function swipeCard(direction) {',
    'function openDealFromSwipe() {',
    'function initSwipeDrag(card, deal) {',
    'function updateSwipeProgress() {',
  ]) {
    assert.equal(hardened.split(definition).length - 1, 1, definition);
  }
  assert.equal(hardened.includes('P6_81_SWIPE_RUNTIME_ACTIONS'), true);
});

test('P6.81 keeps right-swipe save local and bounded', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes('addToFav(id, true);'), true);
  assert.equal(hardened.includes('Sauvegardé dans les favoris de cet appareil'), true);
  assert.equal(hardened.includes('swipeIndex += 1;'), true);
  assert.equal(hardened.includes("if (direction !== 'left' && direction !== 'right') return;"), true);
  assert.equal(hardened.includes('P6_41_FAVORITES_LOCAL_TRUTH'), true);
  assert.equal(hardened.includes('/account/favorites'), false);
});

test('P6.81 restores details, pointer drag and progress without changing the feed', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes('openDeal(id);'), true);
  assert.equal(hardened.includes("card.addEventListener('pointerdown'"), true);
  assert.equal(hardened.includes("card.addEventListener('pointermove'"), true);
  assert.equal(hardened.includes("card.addEventListener('pointerup'"), true);
  assert.equal(hardened.includes('horizontal >= 80'), true);
  assert.equal(hardened.includes("dot.className = 'swipe-dot'"), true);
  assert.equal(hardened.includes('/deals/feed/swipe?limit=20'), true);
  assert.equal(hardened.includes("if (openTarget === 'swipe')    openSwipePage();"), true);
  assert.equal(hardened.includes('P6_79_SWIPE_REFERENCE_GAP_TRUTH'), true);
  assert.equal(hardened.includes('P6_80_BUDGET_SELECTION_COPY_TRUTH'), true);
});

test('P6.81 is wired after P6.80 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p680Call = csp.indexOf('reconcileBudgetSelectionCopyTruth();');
  const p681Call = csp.indexOf('reconcileSwipeRuntimeActions();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p680Call >= 0 && p681Call > p680Call && readCall > p681Call);
});
