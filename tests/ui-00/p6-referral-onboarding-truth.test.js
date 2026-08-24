'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-referral-onboarding-truth');

const fixture = [
  '<html><body><script>',
  "const ONBOARD_STEPS = [{ emoji:'🎁', title:'Parraine tes amis !', text:'Invite un ami et vous gagnez tous les deux 7 jours Premium gratuits. C\\'est parti !' }];",
  '// P6_40_REFERRAL_REWARD_TRUTH',
  'Récompense Premium : suspendue',
  'P6_63_SCORE_FRAMING_TRUTH',
  '</script></body></html>',
].join('\n');

test('P6.64 removes stale Premium referral reward promise from reachable onboarding', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes("title:'Parraine tes amis !'"), false);
  assert.equal(hardened.includes('vous gagnez tous les deux 7 jours Premium gratuits'), false);
  assert.equal(hardened.includes("title:'Parrainage'"), true);
  assert.equal(hardened.includes('aucune récompense Premium n’est actuellement attribuée'), true);
  assert.equal(hardened.includes('P6_64_REFERRAL_ONBOARDING_TRUTH'), true);
});

test('P6.64 preserves the P6.40 suspended referral runtime boundary', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes('P6_40_REFERRAL_REWARD_TRUTH'), true);
  assert.equal(hardened.includes('Récompense Premium : suspendue'), true);
  assert.equal(hardened.includes('P6_63_SCORE_FRAMING_TRUTH'), true);
});

test('P6.64 is wired after P6.63 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p663Call = csp.indexOf('reconcileScoreFramingTruth();');
  const p664Call = csp.indexOf('reconcileReferralOnboardingTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p663Call >= 0 && p664Call > p663Call && readCall > p664Call);
});
