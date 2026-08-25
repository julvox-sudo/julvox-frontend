'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const {
  MARKER,
  LEGACY_FREE_PLAN,
  LEGACY_PREMIUM_PLAN,
  hardenHtml,
} = require('../../scripts/reconcile-signup-premium-truth');

const fixture = [
  '<html><body>',
  '<!-- P6_45_PREMIUM_BENEFIT_TRUTH -->',
  '<script>',
  'function renderSignupForm() {',
  '  document.body.innerHTML = `',
  LEGACY_FREE_PLAN,
  LEGACY_PREMIUM_PLAN,
  '  `;',
  '}',
  'function selectPlan(p) { return p; }',
  'function submitSignup() {}',
  '</script>',
  '</body></html>',
].join('\n');

test('P6.87 makes the reachable signup plan truthful and idempotent', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes('❌ Alertes prix'), false);
  assert.equal(hardened.includes('✅ Score détaillé'), false);
  assert.equal(hardened.includes('✅ Sans pub'), false);
  assert.equal(hardened.includes("✅ Jusqu'à 5 alertes prix"), true);
  assert.equal(hardened.includes('✅ Alertes prix illimitées'), true);
  assert.equal((hardened.match(new RegExp(MARKER, 'g')) || []).length, 1);
});

test('P6.87 preserves signup flow and the P6.45 truth boundary', () => {
  const hardened = hardenHtml(fixture);
  for (const required of [
    'function renderSignupForm() {',
    'function selectPlan(p) {',
    'function submitSignup() {}',
    'P6_45_PREMIUM_BENEFIT_TRUTH',
  ]) assert.equal(hardened.includes(required), true, required);
});

test('P6.87 is wired after P6.86 and before the final CSP read', () => {
  const chain = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'reconcile-wishlist-detail-open-runtime.js'), 'utf8');
  const smartScanCall = chain.indexOf('reconcileSmartScanAuthTransport(target);');
  const signupCall = chain.indexOf('reconcileSignupPremiumTruth(target);');
  assert.ok(smartScanCall >= 0 && signupCall > smartScanCall);
});
