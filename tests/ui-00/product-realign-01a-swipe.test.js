'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { findUnjustifiedDecisionClaims } = require('../../scripts/product-realign-01a-contract.js');
const { neutralizedBuildSwipeCard } = require('../../scripts/product-realign-01a-decision-renderers.js');

const historicalSwipeSource = "score >= 90 ? '<span class=\"record-badge\">🏆 RECORD</span>' : score >= 85 ? '<span class=\"rare-badge\">⭐ RARE</span>' : ''";

function numericScore(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 100 ? score : null;
}

global.document = {
  createElement() {
    return { className: '', innerHTML: '' };
  },
};
global.getCatEmoji = () => '📦';
global.ui00NumericScore = numericScore;

function renderSwipeCard(overrides = {}) {
  return neutralizedBuildSwipeCard({
    name: 'Produit test',
    store: 'Marchand test',
    current_price: 99,
    original_price: 129,
    discount_pct: 23,
    category: 'test',
    image_url: '',
    is_fake: false,
    ...overrides,
  }, true);
}

test('the contract detects the forbidden Swipe score-to-history mapping and accepts the neutralized renderer', () => {
  assert.ok(findUnjustifiedDecisionClaims(historicalSwipeSource).includes('swipe score threshold produces historical badges'));
  assert.ok(!findUnjustifiedDecisionClaims(neutralizedBuildSwipeCard.toString()).includes('swipe score threshold produces historical badges'));
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
