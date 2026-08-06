'use strict';

const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { findUnjustifiedDecisionClaims } = require('../../scripts/product-realign-01a-contract.js');
const { neutralizeUnjustifiedDecisionClaims } = require('../../scripts/product-realign-01a-transform.js');
const { namedFunctionSpans } = require('../../scripts/ui00-transforms/function-spans.js');

const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const transformed = neutralizeUnjustifiedDecisionClaims(source);

function numericScore(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 100 ? score : null;
}

function renderSwipeCard(overrides = {}) {
  const deal = {
    name: 'Produit test',
    store: 'Marchand test',
    current_price: 99,
    original_price: 129,
    discount_pct: 23,
    category: 'test',
    image_url: '',
    is_fake: false,
    ...overrides,
  };
  const spans = namedFunctionSpans(transformed, 'buildSwipeCard');
  assert.equal(spans.length, 1, 'expected one buildSwipeCard function');
  const fn = transformed.slice(spans[0].start, spans[0].end);
  const document = {
    createElement() {
      return { className: '', innerHTML: '' };
    },
  };
  return vm.runInNewContext(
    `(${fn})(${JSON.stringify(deal)}, true)`,
    {
      document,
      getCatEmoji: () => '📦',
      ui00NumericScore: numericScore,
    },
  );
}

test('the source exposes the forbidden Swipe score-to-history mapping and the transform removes it', () => {
  assert.ok(findUnjustifiedDecisionClaims(source).includes('swipe score threshold produces historical badges'));
  assert.ok(!findUnjustifiedDecisionClaims(transformed).includes('swipe score threshold produces historical badges'));
});

test('score 95 does not produce a RECORD badge', () => {
  const card = renderSwipeCard({ novadeal_score: 95 });
  assert.doesNotMatch(card.innerHTML, /record-badge|🏆\s*RECORD/i);
});

test('score 87 does not produce a RARE badge', () => {
  const card = renderSwipeCard({ novadeal_score: 87 });
  assert.doesNotMatch(card.innerHTML, /rare-badge|⭐\s*RARE/i);
});

test('rarity.badge record produces the historical record badge', () => {
  const card = renderSwipeCard({ novadeal_score: 40, rarity: { badge: 'record' } });
  assert.match(card.innerHTML, /class="record-badge">Signal historique : record/);
});

test('rarity.badge rare produces the historical rare badge', () => {
  const card = renderSwipeCard({ novadeal_score: 40, rarity: { badge: 'rare' } });
  assert.match(card.innerHTML, /class="rare-badge">Signal historique : rare/);
});

test('an absent score renders an honest unknown state without fabricated values', () => {
  const card = renderSwipeCard({ novadeal_score: null });
  assert.match(card.innerHTML, /Indicateur indisponible/);
  assert.doesNotMatch(card.innerHTML, /★\s*(?:null|undefined|NaN|0(?:\D|$))/i);
  assert.doesNotMatch(card.innerHTML, /record-badge|rare-badge/);
});

test('an available score without rarity remains a neutral indicator', () => {
  const card = renderSwipeCard({ novadeal_score: 72 });
  assert.match(card.innerHTML, /★ 72/);
  assert.doesNotMatch(card.innerHTML, /record-badge|rare-badge/i);
  const visibleText = card.innerHTML.replace(/<[^>]*>/g, ' ');
  assert.doesNotMatch(visibleText, /\b(?:RECORD|RARE|EXCELLENT|TOP|HOT|PREMIUM|RECOMMANDÉ|EXCEPTIONNEL)\b|À ACHETER/i);
});
