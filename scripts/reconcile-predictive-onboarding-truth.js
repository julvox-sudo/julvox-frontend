'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_54_PREDICTIVE_ONBOARDING_TRUTH';
const LEGACY_INTRO = '<span>🔔 Alertes prix intelligentes et prédictives</span>';
const SAFE_INTRO = `<!-- ${MARKER} --><span>🔔 Alertes prix personnalisées</span>`;
const LEGACY_PREDICTIVE_OPTION = '<div onclick="toggleObNotif(this,\'predictive\')" class="ob-cat-btn" data-notif="predictive"><div class="ob-cat-emoji">🔮</div><div class="ob-cat-label">Prédictions Julvox</div></div>';
const PRICE_ALERT_OPTION = '<div onclick="toggleObNotif(this,\'price_alert\')" class="ob-cat-btn" data-notif="price_alert"><div class="ob-cat-emoji">🔔</div><div class="ob-cat-label">Alertes prix personnalisées</div></div>';

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(`<!-- ${MARKER} -->`)) {
    assertHardened(html);
    return html;
  }

  const introCount = countOf(html, LEGACY_INTRO);
  const optionCount = countOf(html, LEGACY_PREDICTIVE_OPTION);
  if (introCount !== 1) throw new Error(`P6.54 expected one predictive onboarding intro claim, got ${introCount}`);
  if (optionCount !== 1) throw new Error(`P6.54 expected one predictive onboarding option, got ${optionCount}`);

  let output = html.replace(LEGACY_INTRO, SAFE_INTRO);
  output = output.replace(LEGACY_PREDICTIVE_OPTION, '');
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const markerCount = countOf(html, MARKER);
  if (markerCount !== 1) throw new Error(`P6.54 marker count must be 1, got ${markerCount}`);

  for (const unsupported of [
    'Alertes prix intelligentes et prédictives',
    'Prédictions Julvox',
    "toggleObNotif(this,'predictive')",
    'data-notif="predictive"',
  ]) {
    if (html.includes(unsupported)) throw new Error(`P6.54 unsupported predictive onboarding surface remains: ${unsupported}`);
  }

  if (!html.includes(SAFE_INTRO)) throw new Error('P6.54 truthful alert intro is missing');
  if (!html.includes(PRICE_ALERT_OPTION)) throw new Error('P6.54 supported price-alert option must remain');
  if (!html.includes('function toggleObNotif(')) throw new Error('P6.54 generic onboarding notification selector must remain');
  if (!html.includes("obSelectedNotifs = ['flash','daily']")) throw new Error('P6.54 existing non-predictive onboarding defaults must remain');
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_54_PREDICTIVE_ONBOARDING_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
