'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const {
  RUNTIME_MARKER,
  COPY_MARKER,
  LEGACY_ENDPOINT,
  SAFE_ENDPOINT,
  LEGACY_TOAST,
  SAFE_TOAST,
  LEGACY_ONBOARDING,
  TRUTHFUL_ONBOARDING,
  LEGACY_CALENDAR,
  TRUTHFUL_CALENDAR,
  hardenRuntime,
  hardenHtml,
} = require('../../scripts/reconcile-alert-backend-contract-truth');

const runtimeFixture = [
  '(function(){',
  '  globalObject.createAlert = (name, price) => locked(`alert:create:${String(name)}`, async () => {',
  "    const bearer = auth('⚠️ Connecte-toi pour créer une alerte');",
  '    if (!bearer) return null;',
  `    const result = await ${LEGACY_ENDPOINT} { product_name: name, target_price: Number(price) }, { token: bearer, confirm: data => identifier(data?.alert_id) });`,
  "    if (!result.ok) return toast('❌Création de l’alerte impossible.'), result;",
  `    ${LEGACY_TOAST}`,
  '    return result;',
  '  });',
  '})();',
].join('\n');

const htmlFixture = [
  '<html><body><script>',
  'P6_68_ALERT_TARGET_SELECTION_TRUTH',
  `const ONBOARD_STEPS = [{ text:'${LEGACY_ONBOARDING}' /* P6_66_ALERT_ONBOARDING_TARGET_TRUTH */ }];`,
  '</script>',
  `<div itemprop="text">${LEGACY_CALENDAR}</div>`,
  '</body></html>',
].join('\n');

test('P6.88 routes explicit target alerts to the canonical stored-alert endpoint', () => {
  const hardened = hardenRuntime(runtimeFixture);
  assert.equal(hardenRuntime(hardened), hardened);
  assert.equal(hardened.includes(LEGACY_ENDPOINT), false);
  assert.equal(hardened.includes(SAFE_ENDPOINT), true);
  assert.equal(hardened.includes(LEGACY_TOAST), false);
  assert.equal(hardened.includes(SAFE_TOAST), true);
  assert.equal(hardened.includes('token: bearer'), true);
  assert.equal(hardened.includes('identifier(data?.alert_id)'), true);
  assert.equal((hardened.match(new RegExp(RUNTIME_MARKER, 'g')) || []).length, 1);
});

test('P6.88 removes automatic-email promises while preserving explicit target selection truth', () => {
  const hardened = hardenHtml(htmlFixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes(LEGACY_ONBOARDING), false);
  assert.equal(hardened.includes(LEGACY_CALENDAR), false);
  assert.equal(hardened.includes(TRUTHFUL_ONBOARDING), true);
  assert.equal(hardened.includes(TRUTHFUL_CALENDAR), true);
  assert.equal(hardened.includes('P6_66_ALERT_ONBOARDING_TARGET_TRUTH'), true);
  assert.equal(hardened.includes('P6_68_ALERT_TARGET_SELECTION_TRUTH'), true);
  assert.equal((hardened.match(new RegExp(COPY_MARKER, 'g')) || []).length, 1);
});

test('P6.88 is wired after P6.87 in the final pre-CSP chain', () => {
  const chain = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'reconcile-wishlist-detail-open-runtime.js'), 'utf8');
  const signupCall = chain.indexOf('reconcileSignupPremiumTruth(target);');
  const alertCall = chain.indexOf('reconcileAlertBackendContractTruth(target);');
  assert.ok(signupCall >= 0 && alertCall > signupCall);
});
