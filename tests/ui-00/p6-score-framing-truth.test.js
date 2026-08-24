'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-score-framing-truth');

const fixture = [
  '<html><body><script>',
  "const feature = '🏆 Score de confiance Julvox sur chaque deal';",
  "const step = { emoji:'⭐', title:'Score Julvox', text:'Notre algorithme analyse chaque deal sur 100 points : remise réelle, fiabilité du marchand, historique des prix.' };",
  'P6_56_SCORE_SIGNAL_TRUTH',
  'P6_57_MERCHANT_TRUST_CARD_TRUTH',
  'P6_58_COMPARE_MERCHANT_TRUST_TRUTH',
  'P6_62_DEAL_LIVE_VERIFICATION_TRUTH',
  '</script></body></html>',
].join('\n');

test('P6.63 removes confidence and static merchant-reliability framing from public Score Julvox copy', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes('Score de confiance Julvox sur chaque deal'), false);
  assert.equal(hardened.includes('fiabilité du marchand'), false);
  assert.equal(hardened.includes('★ Score Julvox sur chaque deal'), true);
  assert.equal(hardened.includes('Ce score seul ne constitue pas une recommandation d’achat.'), true);
  assert.equal(hardened.includes('P6_63_SCORE_FRAMING_TRUTH'), true);
});

test('P6.63 preserves previous score and merchant-trust boundaries', () => {
  const hardened = hardenHtml(fixture);
  for (const marker of [
    'P6_56_SCORE_SIGNAL_TRUTH',
    'P6_57_MERCHANT_TRUST_CARD_TRUTH',
    'P6_58_COMPARE_MERCHANT_TRUST_TRUTH',
    'P6_62_DEAL_LIVE_VERIFICATION_TRUTH',
  ]) assert.equal(hardened.includes(marker), true);
});

test('P6.63 is wired after P6.62 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p662Call = csp.indexOf('reconcileDealLiveVerificationTruth();');
  const p663Call = csp.indexOf('reconcileScoreFramingTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p662Call >= 0 && p663Call > p662Call && readCall > p663Call);
});
