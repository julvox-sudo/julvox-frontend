'use strict';

const fs = require('node:fs');
const path = require('node:path');

const RUNTIME_MARKER = 'P6_88_ALERT_BACKEND_CONTRACT_TRUTH_RUNTIME';
const COPY_MARKER = 'P6_88_ALERT_DELIVERY_COPY_TRUTH';

const LEGACY_ENDPOINT = "client.post('/alerts/smart',";
const SAFE_ENDPOINT = "client.post('/alerts',";
const LEGACY_TOAST = "toast('🔔 Alerte créée.');";
const SAFE_TOAST = "toast('🔔 Alerte enregistrée. Suivi automatique et emails actuellement suspendus.');";

const LEGACY_ONBOARDING = 'Depuis une offre affichée, choisis un prix cible inférieur au prix observé. Julvox peut ensuite envoyer un email si une offre correspondante atteint cette cible.';
const TRUTHFUL_ONBOARDING = 'Depuis une offre affichée, choisis un prix cible inférieur au prix observé. L’alerte peut être enregistrée, mais son suivi automatique et l’envoi d’email sont actuellement suspendus tant que les observations marché courantes nécessaires ne sont pas disponibles.';

const LEGACY_CALENDAR = "Le Calendrier Promos affiche des repères indicatifs configurés par catégorie. Il ne crée pas d'alerte automatique avant les événements ; pour être prévenu d'une baisse de prix, utilisez une alerte produit.";
const TRUTHFUL_CALENDAR = "Le Calendrier Promos affiche des repères indicatifs configurés par catégorie. Il ne crée pas d'alerte automatique avant les événements. Vous pouvez enregistrer une alerte produit avec un prix cible ; son suivi automatique et l'envoi d'email sont actuellement suspendus.";

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function replaceExactlyOnce(source, legacy, replacement, label) {
  const count = countOf(source, legacy);
  if (count !== 1) throw new Error(`P6.88 expected exactly one ${label}, got ${count}`);
  return source.replace(legacy, replacement);
}

function assertRuntime(runtime) {
  if (countOf(runtime, RUNTIME_MARKER) !== 1) throw new Error('P6.88 runtime marker count must be 1');
  if (runtime.includes(LEGACY_ENDPOINT)) throw new Error('P6.88 quarantined /alerts/smart transport remains');
  if (runtime.includes(LEGACY_TOAST)) throw new Error('P6.88 ambiguous alert success toast remains');
  for (const required of [
    SAFE_ENDPOINT,
    SAFE_TOAST,
    'globalObject.createAlert =',
    'token: bearer',
    'identifier(data?.alert_id)',
  ]) {
    if (!runtime.includes(required)) throw new Error(`P6.88 runtime boundary missing: ${required}`);
  }
}

function hardenRuntime(runtime) {
  if (runtime.includes(`/* ${RUNTIME_MARKER} */`)) {
    assertRuntime(runtime);
    return runtime;
  }
  let output = replaceExactlyOnce(runtime, LEGACY_ENDPOINT, SAFE_ENDPOINT, 'quarantined alert endpoint');
  output = replaceExactlyOnce(output, LEGACY_TOAST, SAFE_TOAST, 'legacy alert success toast');
  output = replaceExactlyOnce(
    output,
    'globalObject.createAlert =',
    `/* ${RUNTIME_MARKER} */\n        globalObject.createAlert =`,
    'canonical createAlert runtime authority',
  );
  assertRuntime(output);
  return output;
}

function assertHtml(html) {
  if (countOf(html, COPY_MARKER) !== 1) throw new Error('P6.88 copy marker count must be 1');
  for (const unsupported of [LEGACY_ONBOARDING, LEGACY_CALENDAR]) {
    if (html.includes(unsupported)) throw new Error('P6.88 legacy automatic-alert delivery promise remains');
  }
  for (const required of [
    TRUTHFUL_ONBOARDING,
    TRUTHFUL_CALENDAR,
    'P6_66_ALERT_ONBOARDING_TARGET_TRUTH',
    'P6_68_ALERT_TARGET_SELECTION_TRUTH',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.88 copy boundary missing: ${required}`);
  }
}

function hardenHtml(html) {
  if (html.includes(`/* ${COPY_MARKER} */`)) {
    assertHtml(html);
    return html;
  }
  let output = replaceExactlyOnce(html, LEGACY_ONBOARDING, TRUTHFUL_ONBOARDING, 'legacy onboarding alert delivery promise');
  output = replaceExactlyOnce(output, LEGACY_CALENDAR, TRUTHFUL_CALENDAR, 'legacy calendar alert delivery promise');
  output = replaceExactlyOnce(
    output,
    '/* P6_66_ALERT_ONBOARDING_TARGET_TRUTH */',
    `/* P6_66_ALERT_ONBOARDING_TARGET_TRUTH */ /* ${COPY_MARKER} */`,
    'P6.66 alert onboarding truth marker',
  );
  assertHtml(output);
  return output;
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const runtimeTarget = path.join(path.dirname(target), 'ui-00-production-truth.js');
  if (!fs.existsSync(target) || !fs.existsSync(runtimeTarget)) {
    throw new Error('P6.88 public artifact inputs are missing');
  }
  fs.writeFileSync(target, hardenHtml(fs.readFileSync(target, 'utf8')), 'utf8');
  fs.writeFileSync(runtimeTarget, hardenRuntime(fs.readFileSync(runtimeTarget, 'utf8')), 'utf8');
  console.log('P6_88_ALERT_BACKEND_CONTRACT_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = {
  RUNTIME_MARKER,
  COPY_MARKER,
  LEGACY_ENDPOINT,
  SAFE_ENDPOINT,
  LEGACY_TOAST,
  SAFE_TOAST,
  LEGACY_ONBOARDING,
  TRUTHFUL_ONBOARDING,
  LEGACY_CALENDAR,
  TRUTHFUL_CALENDAR,
  assertRuntime,
  hardenRuntime,
  assertHtml,
  hardenHtml,
  hardenPublicArtifact,
};
