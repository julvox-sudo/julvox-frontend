'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_87_SIGNUP_PREMIUM_TRUTH';

const LEGACY_FREE_PLAN = '<div class="plan-feats"><div class="plan-feat">✅ Tous les deals</div><div class="plan-feat">✅ Favoris sur cet appareil</div><div class="plan-feat">✅ Newsletter</div><div class="plan-feat">❌ Alertes prix</div></div>';
const TRUTHFUL_FREE_PLAN = '<div class="plan-feats"><div class="plan-feat">✅ Tous les deals</div><div class="plan-feat">✅ Favoris sur cet appareil</div><div class="plan-feat">✅ Newsletter</div><div class="plan-feat">✅ Jusqu\'à 5 alertes prix</div></div>';

const LEGACY_PREMIUM_PLAN = '<div class="plan-feats"><div class="plan-feat">✅ Tout le gratuit</div><div class="plan-feat">✅ Alertes illimitées</div><div class="plan-feat">✅ Score détaillé</div><div class="plan-feat">✅ Sans pub</div></div>';
const TRUTHFUL_PREMIUM_PLAN = '<div class="plan-feats"><div class="plan-feat">✅ Tout le gratuit</div><div class="plan-feat">✅ Alertes prix illimitées</div></div>';

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.87 marker count must be 1');
  for (const unsupported of [
    '❌ Alertes prix',
    '✅ Score détaillé',
    '✅ Sans pub',
  ]) {
    if (html.includes(unsupported)) {
      throw new Error(`P6.87 unsupported signup plan claim remains: ${unsupported}`);
    }
  }
  for (const required of [
    "✅ Jusqu'à 5 alertes prix",
    '✅ Alertes prix illimitées',
    'function renderSignupForm() {',
    "function selectPlan(p) {",
    "submitSignup()",
    'P6_45_PREMIUM_BENEFIT_TRUTH',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.87 required boundary missing: ${required}`);
  }
}

function hardenHtml(html) {
  if (html.includes(`<!-- ${MARKER} -->`)) {
    assertHardened(html);
    return html;
  }

  const freeCount = countOf(html, LEGACY_FREE_PLAN);
  const premiumCount = countOf(html, LEGACY_PREMIUM_PLAN);
  if (freeCount !== 1) throw new Error(`P6.87 expected one legacy free signup plan, got ${freeCount}`);
  if (premiumCount !== 1) throw new Error(`P6.87 expected one legacy Premium signup plan, got ${premiumCount}`);

  let output = html.replace(LEGACY_FREE_PLAN, `<!-- ${MARKER} -->${TRUTHFUL_FREE_PLAN}`);
  output = output.replace(LEGACY_PREMIUM_PLAN, TRUTHFUL_PREMIUM_PLAN);
  assertHardened(output);
  return output;
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  fs.writeFileSync(target, hardenHtml(source), 'utf8');
  console.log('P6_87_SIGNUP_PREMIUM_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = {
  MARKER,
  LEGACY_FREE_PLAN,
  TRUTHFUL_FREE_PLAN,
  LEGACY_PREMIUM_PLAN,
  TRUTHFUL_PREMIUM_PLAN,
  assertHardened,
  hardenHtml,
  hardenPublicArtifact,
};
