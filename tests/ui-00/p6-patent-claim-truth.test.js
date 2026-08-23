'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-patent-claim-truth');

const fixture = `<!doctype html><html><body>
<div>Données mises à jour à partir des données disponibles · Score Julvox breveté</div>
</body></html>`;

test('P6.52 removes the unsupported patent-status claim only', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.doesNotMatch(hardened, /Score Julvox breveté/);
  assert.match(hardened, /P6_52_PATENT_CLAIM_TRUTH/);
  assert.match(hardened, /Score Julvox/);
  assert.match(hardened, /Données mises à jour à partir des données disponibles/);
});

test('P6.52 is wired after P6.51 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p651Call = csp.indexOf('reconcileLegacyDealAnalysisTruth();');
  const p652Call = csp.indexOf('reconcilePatentClaimTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p651Call >= 0 && p652Call > p651Call && readCall > p652Call);
});
