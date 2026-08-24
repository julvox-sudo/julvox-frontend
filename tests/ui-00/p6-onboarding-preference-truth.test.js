'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-onboarding-preference-truth');

const fixture = `<!doctype html><html><body>
<div id="onboardingOverlay">
  <div>
    <div class="ob-step active" id="obStep1"><button onclick="obNext(2)">Commencer</button></div>
    <!-- Step 2 : Catégories -->
    <div class="ob-step" id="obStep2">
      <div class="ob-title">Vos centres d'intérêt</div>
      <div class="ob-subtitle">Choisissez les catégories qui vous intéressent pour personnaliser votre feed</div>
      <button onclick="toggleObCat(this,'high-tech')">High-Tech</button>
      <button class="ob-next-btn" onclick="obNext(3)">Suivant →</button>
    </div>
    <!-- Step 3 : Budget habituel -->
    <div class="ob-step" id="obStep3">
      <div class="ob-title">Votre budget habituel</div>
      <div class="ob-subtitle">Pour vous proposer des deals adaptés à vos moyens</div>
      <div onclick="selectObBudget(this,150)">150€</div>
      <button class="ob-next-btn" onclick="obNext(4)">Suivant →</button>
    </div>
    <!-- Step 4 : Notifications -->
    <div class="ob-step" id="obStep4">
      <div class="ob-title">Restez informé</div>
      <div class="ob-subtitle">Activez les alertes pour ne jamais rater une bonne affaire</div>
      <div onclick="toggleObNotif(this,'flash')" data-notif="flash">Flash</div>
      <div onclick="toggleObNotif(this,'daily')" data-notif="daily">Daily</div>
      <div onclick="toggleObNotif(this,'price_alert')" data-notif="price_alert">Prix</div>
      <button class="ob-next-btn" onclick="completeOnboarding()">🚀 Démarrer Julvox !</button>
    </div>
  </div>
</div>
<script>
let obCurrentStep  = 1;
const obTotalSteps = 4;
let obSelectedCats = [], obSelectedBudget = null, obSelectedNotifs = ['flash','daily'];
function initOnboardingProgress() {}
function obNext(step) { obCurrentStep = step; }
function toggleObCat(el, cat) {
  const idx = obSelectedCats.indexOf(cat);
  if (idx >= 0) obSelectedCats.splice(idx,1); else obSelectedCats.push(cat);
}
function selectObBudget(el, budget) { obSelectedBudget = budget; }
function toggleObNotif(el, type) {
  const idx = obSelectedNotifs.indexOf(type);
  if (idx >= 0) obSelectedNotifs.splice(idx,1); else obSelectedNotifs.push(type);
}
async function completeOnboarding() {
  const token = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.token : localStorage.getItem('token');
  try {
    if (token) {
      await window.JULVOX_API.fetchResponse(API + '/onboarding/complete', {
        method: 'POST', headers: {'Authorization':'Bearer '+token, 'Content-Type':'application/json'},
        body: JSON.stringify({ categories: obSelectedCats, budget: obSelectedBudget, deal_types: obSelectedNotifs }),
      });
    }
  } catch(e) {}
  localStorage.setItem('ds_onboarding_done', '1');
  if (obSelectedCats.length) localStorage.setItem('ds_pref_cats', JSON.stringify(obSelectedCats));
  document.getElementById('onboardingOverlay').style.display = 'none';
  showToast('🚀 Bienvenue sur Julvox !');
}

function checkOnboarding() {}
</script>
</body></html>`;

function executableInlineScripts(html) {
  const scripts = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const attrs = match[1] || '';
    if (/\bsrc\s*=/i.test(attrs)) continue;
    scripts.push(match[2] || '');
  }
  return scripts;
}

test('P6.55 removes no-op personalization controls and promises', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.doesNotMatch(hardened, /personnaliser votre feed/);
  assert.doesNotMatch(hardened, /deals adaptés à vos moyens/);
  assert.doesNotMatch(hardened, /ne jamais rater une bonne affaire/);
  assert.doesNotMatch(hardened, /data-notif=/);
  assert.doesNotMatch(hardened, /obSelectedCats|obSelectedBudget|obSelectedNotifs/);
  assert.match(hardened, /P6_55_ONBOARDING_PREFERENCE_TRUTH/);
});

test('P6.55 keeps onboarding local and contextual without claiming preference sync', () => {
  const hardened = hardenHtml(fixture);
  assert.match(hardened, /Décidez selon votre besoin du moment/);
  assert.match(hardened, /ne transforme pas ce premier passage en budget permanent/);
  assert.match(hardened, /Cet onboarding n’active aucune notification/);
  assert.match(hardened, /API \+ '\/onboarding\/complete'/);
  assert.match(hardened, /body: JSON\.stringify\(\{\}\)/);
  assert.match(hardened, /ds_onboarding_done/);
  for (const source of executableInlineScripts(hardened)) new vm.Script(source);
});

test('P6.55 is wired after P6.54 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p654Call = csp.indexOf('reconcilePredictiveOnboardingTruth();');
  const p655Call = csp.indexOf('reconcileOnboardingPreferenceTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p654Call >= 0 && p655Call > p654Call && readCall > p655Call);
});
