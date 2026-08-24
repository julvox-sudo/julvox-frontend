'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-deal-live-verification-truth');

const fixture = [
  '<html><body><script>',
  "const onboardSteps = [{ emoji:'✅', title:'Deals vérifiés à partir des données disponibles', text:'Chaque deal est vérifié toutes les heures. Le badge ✓ indique que le prix est encore valide maintenant.' }];",
  'P6_50_DEAL_VERIFICATION_COPY_TRUTH',
  'P6_61_PROMO_VOTE_RATIO_TRUTH',
  '</script></body></html>',
].join('\n');

test('P6.62 removes unsupported hourly/live deal verification promise', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes('Deals vérifiés à partir des données disponibles'), false);
  assert.equal(hardened.includes('Chaque deal est vérifié toutes les heures.'), false);
  assert.equal(hardened.includes('prix est encore valide maintenant'), false);
  assert.equal(hardened.includes('Offres analysées à partir des données disponibles'), true);
  assert.equal(hardened.includes('dernières observations disponibles et peuvent avoir changé depuis'), true);
  assert.equal(hardened.includes('P6_62_DEAL_LIVE_VERIFICATION_TRUTH'), true);
});

test('P6.62 preserves prior deal-copy and P6.61 boundaries', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes('P6_50_DEAL_VERIFICATION_COPY_TRUTH'), true);
  assert.equal(hardened.includes('P6_61_PROMO_VOTE_RATIO_TRUTH'), true);
});

test('P6.62 is wired after P6.61 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p661Call = csp.indexOf('reconcilePromoVoteRatioTruth();');
  const p662Call = csp.indexOf('reconcileDealLiveVerificationTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p661Call >= 0 && p662Call > p661Call && readCall > p662Call);
});
