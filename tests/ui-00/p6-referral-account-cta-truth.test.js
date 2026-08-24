'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-referral-account-cta-truth');

const fixture = [
  '<html><body><script>',
  'function openReferralPage() {}',
  "const account = '<div class=\"account-item\" onclick=\"openReferralPage()\"><span>🎁 Parrainage</span><span>Gagner du Premium →</span></div>';",
  '// P6_40_REFERRAL_REWARD_TRUTH',
  'Récompense Premium : suspendue',
  'P6_64_REFERRAL_ONBOARDING_TRUTH',
  '</script></body></html>',
].join('\n');

test('P6.65 removes stale Premium-earning CTA from account referral action', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes('Gagner du Premium →'), false);
  assert.equal(hardened.includes('Voir le parrainage →'), true);
  assert.equal(hardened.includes('P6_65_REFERRAL_ACCOUNT_CTA_TRUTH'), true);
});

test('P6.65 preserves referral navigation and suspended-reward boundaries', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes('onclick="openReferralPage()"'), true);
  assert.equal(hardened.includes('P6_40_REFERRAL_REWARD_TRUTH'), true);
  assert.equal(hardened.includes('Récompense Premium : suspendue'), true);
  assert.equal(hardened.includes('P6_64_REFERRAL_ONBOARDING_TRUTH'), true);
});

test('P6.65 is wired after P6.64 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p664Call = csp.indexOf('reconcileReferralOnboardingTruth();');
  const p665Call = csp.indexOf('reconcileReferralAccountCtaTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p664Call >= 0 && p665Call > p664Call && readCall > p665Call);
});
