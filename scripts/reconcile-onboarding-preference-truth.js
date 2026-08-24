'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_55_ONBOARDING_PREFERENCE_TRUTH';

const STEP_2_PATTERN = /    <!-- Step 2 : Catégories -->[\s\S]*?(?=\n    <!-- Step 3 : Budget habituel -->)/;
const STEP_3_PATTERN = /    <!-- Step 3 : Budget habituel -->[\s\S]*?(?=\n    <!-- Step 4 : Notifications -->)/;
const STEP_4_PATTERN = /    <!-- Step 4 : Notifications -->[\s\S]*?<button class="ob-next-btn" onclick="completeOnboarding\(\)">🚀 Démarrer Julvox !<\/button>\s*<\/div>/;
const SELECTION_RUNTIME_PATTERN = /let obSelectedCats = \[\], obSelectedBudget = null, obSelectedNotifs = \['flash','daily'\];[\s\S]*?(?=async function completeOnboarding\(\))/;
const COMPLETE_RUNTIME_PATTERN = /async function completeOnboarding\(\) \{[\s\S]*?\n\}(?=\n\nfunction checkOnboarding\(\))/;

const SAFE_STEP_2 = `    <!-- Step 2 : Décision contextuelle -->
    <div class="ob-step" id="obStep2">
      <!-- ${MARKER} -->
      <div class="ob-title">Décidez selon votre besoin du moment</div>
      <div class="ob-subtitle">Vos critères peuvent changer d’un achat à l’autre. Julvox les clarifie au moment de votre recherche ou du Smart Scan, plutôt que de figer ici des préférences non garanties.</div>
      <button class="ob-next-btn" onclick="obNext(3)">Suivant →</button>
    </div>
`;

const SAFE_STEP_3 = `    <!-- Step 3 : Budget contextuel -->
    <div class="ob-step" id="obStep3">
      <div class="ob-title">Un budget adapté à chaque achat</div>
      <div class="ob-subtitle">Indiquez votre budget dans votre demande quand il est utile à la décision. Julvox ne transforme pas ce premier passage en budget permanent.</div>
      <button class="ob-next-btn" onclick="obNext(4)">Suivant →</button>
    </div>
`;

const SAFE_STEP_4 = `    <!-- Step 4 : Alertes réelles -->
    <div class="ob-step" id="obStep4">
      <div class="ob-title">Alertes prix</div>
      <div class="ob-subtitle">Les alertes prix se configurent depuis un produit que vous souhaitez suivre. Cet onboarding n’active aucune notification.</div>
      <button class="ob-next-btn" onclick="completeOnboarding()">🚀 Démarrer Julvox !</button>
    </div>`;

const SAFE_COMPLETE_RUNTIME = `async function completeOnboarding() {
  const token = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.token : localStorage.getItem('token');
  try {
    if (token) {
      // Compatibility ping only: no preference-sync claim is made by the public UI.
      await window.JULVOX_API.fetchResponse(API + '/onboarding/complete', {
        method: 'POST', headers: {'Authorization':'Bearer '+token, 'Content-Type':'application/json'},
        body: JSON.stringify({}),
      });
    }
  } catch(e) {}
  localStorage.setItem('ds_onboarding_done', '1');
  document.getElementById('onboardingOverlay').style.display = 'none';
  showToast('🚀 Julvox est prêt !');
}`;

function hardenHtml(html) {
  if (html.includes(`<!-- ${MARKER} -->`)) {
    assertHardened(html);
    return html;
  }

  if (!STEP_2_PATTERN.test(html)) throw new Error('P6.55 could not locate onboarding category step');
  if (!STEP_3_PATTERN.test(html)) throw new Error('P6.55 could not locate onboarding budget step');
  if (!STEP_4_PATTERN.test(html)) throw new Error('P6.55 could not locate onboarding notification step');
  if (!SELECTION_RUNTIME_PATTERN.test(html)) throw new Error('P6.55 could not locate onboarding preference runtime');
  if (!COMPLETE_RUNTIME_PATTERN.test(html)) throw new Error('P6.55 could not locate onboarding completion runtime');

  let output = html.replace(STEP_2_PATTERN, SAFE_STEP_2);
  output = output.replace(STEP_3_PATTERN, SAFE_STEP_3);
  output = output.replace(STEP_4_PATTERN, SAFE_STEP_4);
  output = output.replace(SELECTION_RUNTIME_PATTERN, '');
  output = output.replace(COMPLETE_RUNTIME_PATTERN, SAFE_COMPLETE_RUNTIME);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const markerCount = html.split(MARKER).length - 1;
  if (markerCount !== 1) throw new Error(`P6.55 marker count must be 1, got ${markerCount}`);

  for (const unsupported of [
    'personnaliser votre feed',
    'Pour vous proposer des deals adaptés à vos moyens',
    'Activez les alertes pour ne jamais rater une bonne affaire',
    'data-notif="flash"',
    'data-notif="daily"',
    'data-notif="price_alert"',
    'toggleObCat(',
    'selectObBudget(',
    'toggleObNotif(',
    'obSelectedCats',
    'obSelectedBudget',
    'obSelectedNotifs',
    "localStorage.setItem('ds_pref_cats'",
  ]) {
    if (html.includes(unsupported)) throw new Error(`P6.55 unsupported onboarding preference surface remains: ${unsupported}`);
  }

  for (const required of [
    'Décidez selon votre besoin du moment',
    'Julvox ne transforme pas ce premier passage en budget permanent.',
    'Les alertes prix se configurent depuis un produit que vous souhaitez suivre.',
    'Cet onboarding n’active aucune notification.',
    "API + '/onboarding/complete'",
    'body: JSON.stringify({})',
    "localStorage.setItem('ds_onboarding_done', '1')",
    'function checkOnboarding()',
    'const obTotalSteps = 4;',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.55 required onboarding truth boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_55_ONBOARDING_PREFERENCE_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
