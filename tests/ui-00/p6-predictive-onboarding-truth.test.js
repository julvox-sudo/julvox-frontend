'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-predictive-onboarding-truth');

const fixture = `<!doctype html><html><body>
<div><span>🔔 Alertes prix intelligentes et prédictives</span></div>
<div onclick="toggleObNotif(this,'flash')" class="ob-cat-btn selected" data-notif="flash">Flash</div>
<div onclick="toggleObNotif(this,'daily')" class="ob-cat-btn selected" data-notif="daily">Daily</div>
<div onclick="toggleObNotif(this,'price_alert')" class="ob-cat-btn" data-notif="price_alert"><div class="ob-cat-emoji">🔔</div><div class="ob-cat-label">Alertes prix personnalisées</div></div>
<div onclick="toggleObNotif(this,'predictive')" class="ob-cat-btn" data-notif="predictive"><div class="ob-cat-emoji">🔮</div><div class="ob-cat-label">Prédictions Julvox</div></div>
<script>
let obCurrentStep = 1;
let obSelectedCats = [], obSelectedBudget = null, obSelectedNotifs = ['flash','daily'];
function toggleObNotif(el, type) {
  const idx = obSelectedNotifs.indexOf(type);
  if (idx >= 0) obSelectedNotifs.splice(idx,1); else obSelectedNotifs.push(type);
}
</script>
</body></html>`;

test('P6.54 removes unsupported predictive onboarding claims and choice', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.doesNotMatch(hardened, /Alertes prix intelligentes et prédictives/);
  assert.doesNotMatch(hardened, /Prédictions Julvox/);
  assert.doesNotMatch(hardened, /data-notif="predictive"/);
  assert.doesNotMatch(hardened, /toggleObNotif\(this,'predictive'\)/);
  assert.match(hardened, /P6_54_PREDICTIVE_ONBOARDING_TRUTH/);
  assert.match(hardened, /Alertes prix personnalisées/);
});

test('P6.54 preserves supported price alerts and non-predictive onboarding defaults', () => {
  const hardened = hardenHtml(fixture);
  assert.match(hardened, /data-notif="price_alert"/);
  assert.match(hardened, /toggleObNotif\(this,'price_alert'\)/);
  assert.match(hardened, /function toggleObNotif\(/);
  assert.match(hardened, /obSelectedNotifs = \['flash','daily'\]/);
});

test('P6.54 is wired after P6.53 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p653Call = csp.indexOf('reconcilePriceHistoryWindowTruth();');
  const p654Call = csp.indexOf('reconcilePredictiveOnboardingTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p653Call >= 0 && p654Call > p653Call && readCall > p654Call);
});
