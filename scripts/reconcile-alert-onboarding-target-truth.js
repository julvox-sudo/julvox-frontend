'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_66_ALERT_ONBOARDING_TARGET_TRUTH';
const LEGACY_TEXT = "text:'Crée une alerte sur n\\'importe quel produit. On te prévient dès que le prix baisse au niveau que tu veux.'";
const SAFE_TEXT = "text:'Depuis une offre affichée, crée une alerte au prix observé. Julvox peut ensuite envoyer un email si une offre correspondante répond aux conditions de l’alerte.'";

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(MARKER)) {
    assertHardened(html);
    return html;
  }
  if (countOf(html, LEGACY_TEXT) !== 1) {
    throw new Error(`P6.66 expected one legacy alert onboarding promise, got ${countOf(html, LEGACY_TEXT)}`);
  }

  const output = html.replace(LEGACY_TEXT, `${SAFE_TEXT} /* ${MARKER} */`);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.66 marker count must be 1');
  if (html.includes(LEGACY_TEXT)) throw new Error('P6.66 legacy arbitrary-target alert promise remains');
  for (const required of [
    SAFE_TEXT,
    'P6_55_ONBOARDING_PREFERENCE_TRUTH',
    'window.JulvoxDynamicDealTrust.createAlertFromDeal',
    'P6_65_REFERRAL_ACCOUNT_CTA_TRUTH',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.66 required alert truth boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_66_ALERT_ONBOARDING_TARGET_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
