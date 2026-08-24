'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-promo-stats-truth');

const fixture = [
  '<html><body><script>',
  'P6_61_PROMO_VOTE_RATIO_TRUTH',
  'P6_66_ALERT_ONBOARDING_TARGET_TRUTH',
  'const working  = _allPromos.filter(p => { const tot = (p.votes_ok||0)+(p.votes_ko||0); return tot > 0 && (p.votes_ok||0)/tot >= 0.7; }).length;',
  "const verified = _allPromos.filter(p => p.source === 'verified' || p.is_verified).length;",
  "el.innerHTML = '<div>Codes actifs</div><div>Confirmés ✅</div><div>Vérifiés ✓</div>';",
  '</script></body></html>',
].join('\n');

test('P6.67 labels promo aggregate stats according to their actual semantics', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes('Codes actifs'), false);
  assert.equal(hardened.includes('Confirmés ✅'), false);
  assert.equal(hardened.includes('Codes affichés'), true);
  assert.equal(hardened.includes('≥70% votes positifs'), true);
  assert.equal(hardened.includes('P6_67_PROMO_STATS_TRUTH'), true);
});

test('P6.67 preserves vote math and independent verified status', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes('(p.votes_ok||0)/tot >= 0.7'), true);
  assert.equal(hardened.includes("p.source === 'verified' || p.is_verified"), true);
  assert.equal(hardened.includes('Vérifiés ✓'), true);
  assert.equal(hardened.includes('P6_61_PROMO_VOTE_RATIO_TRUTH'), true);
  assert.equal(hardened.includes('P6_66_ALERT_ONBOARDING_TARGET_TRUTH'), true);
});

test('P6.67 is wired after P6.66 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p666Call = csp.indexOf('reconcileAlertOnboardingTargetTruth();');
  const p667Call = csp.indexOf('reconcilePromoStatsTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p666Call >= 0 && p667Call > p666Call && readCall > p667Call);
});
