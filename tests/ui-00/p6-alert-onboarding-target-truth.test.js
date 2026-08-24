'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-alert-onboarding-target-truth');

const fixture = [
  '<html><body><script>',
  "const ONBOARD_STEPS = [{ emoji:'🔔', title:'Alertes prix personnalisées', text:'Crée une alerte sur n\\'importe quel produit. On te prévient dès que le prix baisse au niveau que tu veux.' }];",
  'P6_55_ONBOARDING_PREFERENCE_TRUTH',
  'window.JulvoxDynamicDealTrust.createAlertFromDeal',
  'P6_65_REFERRAL_ACCOUNT_CTA_TRUTH',
  '</script></body></html>',
].join('\n');

test('P6.66 removes arbitrary product/target and guaranteed alert-delivery promise', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes('n\\\'importe quel produit'), false);
  assert.equal(hardened.includes('au niveau que tu veux'), false);
  assert.equal(hardened.includes('On te prévient dès que'), false);
  assert.equal(hardened.includes('Depuis une offre affichée, crée une alerte au prix observé.'), true);
  assert.equal(hardened.includes('peut ensuite envoyer un email'), true);
  assert.equal(hardened.includes('P6_66_ALERT_ONBOARDING_TARGET_TRUTH'), true);
});

test('P6.66 preserves real product alert entry point and previous truth boundaries', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes('window.JulvoxDynamicDealTrust.createAlertFromDeal'), true);
  assert.equal(hardened.includes('P6_55_ONBOARDING_PREFERENCE_TRUTH'), true);
  assert.equal(hardened.includes('P6_65_REFERRAL_ACCOUNT_CTA_TRUTH'), true);
});

test('P6.66 is wired after P6.65 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p665Call = csp.indexOf('reconcileReferralAccountCtaTruth();');
  const p666Call = csp.indexOf('reconcileAlertOnboardingTargetTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p665Call >= 0 && p666Call > p665Call && readCall > p666Call);
});
