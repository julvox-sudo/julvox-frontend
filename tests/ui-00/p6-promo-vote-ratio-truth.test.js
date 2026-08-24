'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-promo-vote-ratio-truth');

const fixture = [
  '<html><body>',
  'const total      = p.votes_ok + p.votes_ko;',
  'const pct        = total > 0 ? Math.round(p.votes_ok / total * 100) : null;',
  "const isVerified = p.source === 'verified' || p.is_verified;",
  'let trustLabel;',
  'trustLabel = `✅ ${pct}% de réussite`;',
  'trustLabel = `⚠️ ${pct}% de réussite`;',
  'trustLabel = `❌ ${pct}% — peut-être expiré`;',
  "${isVerified ? '✓ Vérifié' : '🤝 Communauté'}",
  'P6_60_PROMO_POINTS_TRUTH',
  '</body></html>',
].join('\n');

test('P6.61 labels community ratio as votes rather than success or expiry evidence', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal(hardened.includes('de réussite'), false);
  assert.equal(hardened.includes('peut-être expiré'), false);
  assert.equal((hardened.match(/de votes positifs/g) || []).length, 3);
  assert.equal(hardened.includes('P6_61_PROMO_VOTE_RATIO_TRUTH'), true);
});

test('P6.61 preserves independent verified/community status and raw vote ratio', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardened.includes('p.votes_ok + p.votes_ko'), true);
  assert.equal(hardened.includes('p.votes_ok / total * 100'), true);
  assert.equal(hardened.includes("p.source === 'verified' || p.is_verified"), true);
  assert.equal(hardened.includes("${isVerified ? '✓ Vérifié' : '🤝 Communauté'}"), true);
  assert.equal(hardened.includes('P6_60_PROMO_POINTS_TRUTH'), true);
});

test('P6.61 is wired after P6.60 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p660Call = csp.indexOf('reconcilePromoPointsTruth();');
  const p661Call = csp.indexOf('reconcilePromoVoteRatioTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p660Call >= 0 && p661Call > p660Call && readCall > p661Call);
});
