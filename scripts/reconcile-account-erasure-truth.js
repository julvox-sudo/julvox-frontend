'use strict';

const fs = require('node:fs');
const path = require('node:path');

const INDEX_MARKER = 'P6_43_ACCOUNT_ERASURE_TRUTH_INDEX';
const RUNTIME_MARKER = 'P6_43_ACCOUNT_ERASURE_TRUTH_RUNTIME';
const LEGACY_START = 'function requestAccountDeletion() {';
const LEGACY_END = '// ── AUTH ──';
const CONFIRM_START = 'function confirmDeleteAccount() {';
const CONFIRM_END = '// ══════════════════════════════════════════════════════════════\n// 1. ONBOARDING ANIMÉ';

function hardenIndexHtml(html) {
  if (html.includes(`// ${INDEX_MARKER}`)) {
    assertIndex(html);
    return html;
  }

  let output = html;
  const oldPrivacyLabel = '<div style="font-size:13px;color:var(--txt2);margin-bottom:8px">🗑️ Demander la suppression de mon compte et mes données :</div>';
  const truthfulPrivacyLabel = '<div style="font-size:13px;color:var(--txt2);margin-bottom:8px">🗑️ Anonymiser mon compte et le graphe local couvert. Pour toute demande d’effacement au-delà de ce périmètre, utilisez aussi le contact RGPD ci-dessus :</div>';
  if (!output.includes(oldPrivacyLabel)) throw new Error('P6.43 privacy erasure label missing');
  output = output.replace(oldPrivacyLabel, truthfulPrivacyLabel);

  if (!output.includes('Supprimer mon compte et mes données')) throw new Error('P6.43 privacy erasure button missing');
  output = output.replace('Supprimer mon compte et mes données', 'Anonymiser mon compte Julvox');

  const oldDanger = 'La suppression de votre compte est irréversible. Toutes vos données seront effacées conformément au RGPD (Art. 17).';
  const truthfulDanger = 'L’anonymisation du compte est irréversible pour le profil et le graphe local explicitement couvert. Certaines données hors de ce périmètre peuvent rester soumises à leurs obligations ou politiques de conservation.';
  if (!output.includes(oldDanger)) throw new Error('P6.43 account danger-zone claim missing');
  output = output.replace(oldDanger, truthfulDanger);

  const legacyStart = output.indexOf(LEGACY_START);
  const legacyEnd = output.indexOf(LEGACY_END, legacyStart + LEGACY_START.length);
  if (legacyStart < 0 || legacyEnd < 0 || legacyEnd <= legacyStart) throw new Error('P6.43 legacy privacy deletion anchors missing');
  const legacy = output.slice(legacyStart, legacyEnd);
  for (const required of ['const msg =', 'Demande de suppression envoyée — délai : 30 jours', "API + '/account/delete'"]) {
    if (!legacy.includes(required)) throw new Error(`P6.43 expected legacy privacy deletion behavior missing: ${required}`);
  }

  const privacyDelegate = `// ${INDEX_MARKER}
function requestAccountDeletion() {
  if (typeof currentUser === 'undefined' || !currentUser?.token) {
    window.location.href = 'mailto:contact@julvox.com?subject=Demande RGPD Julvox&body=Bonjour, je souhaite exercer mon droit à l’effacement au-delà du périmètre d’anonymisation disponible dans mon compte Julvox.';
    return null;
  }
  return confirmDeleteAccount();
}

`;
  output = output.slice(0, legacyStart) + privacyDelegate + output.slice(legacyEnd);

  const confirmStart = output.indexOf(CONFIRM_START);
  const confirmEnd = output.indexOf(CONFIRM_END, confirmStart + CONFIRM_START.length);
  if (confirmStart < 0 || confirmEnd < 0 || confirmEnd <= confirmStart) throw new Error('P6.43 account confirmation anchors missing');
  const legacyConfirm = output.slice(confirmStart, confirmEnd);
  if (!legacyConfirm.includes('Toutes vos données personnelles seront effacées')) throw new Error('P6.43 expected global-erasure confirmation promise missing');

  const truthfulConfirm = `function confirmDeleteAccount() {
  const confirmed = confirm('⚠️ Anonymiser votre compte Julvox ?\\n\\nCette action est irréversible pour votre profil et le graphe local explicitement couvert. Certaines données hors de ce périmètre peuvent être conservées selon leurs obligations ou politiques applicables.\\n\\nConfirmer ?');
  if (!confirmed) return;
  return deleteAccount();
}



`;
  output = output.slice(0, confirmStart) + truthfulConfirm + output.slice(confirmEnd);

  assertIndex(output);
  return output;
}

function hardenRuntime(runtimeJs) {
  if (runtimeJs.includes(`/* ${RUNTIME_MARKER} */`)) {
    assertRuntime(runtimeJs);
    return runtimeJs;
  }

  const legacyConfirm = "confirm: (data, response) => response?.status === 204 || data?.rgpd === true";
  const truthfulConfirm = "confirm: (data, response) => response?.status === 200 && data?.status === 'anonymized' && data?.scope === 'profile_and_covered_local_identity_graph' && data?.full_erasure === false";
  if (!runtimeJs.includes(legacyConfirm)) throw new Error('P6.43 UI-00 delete confirmation predicate missing');
  let output = runtimeJs.replace(legacyConfirm, truthfulConfirm);

  const oldToast = "toast('✅ Demande de suppression enregistrée.');";
  const truthfulToast = "toast('✅ Profil et graphe local couvert anonymisés.');";
  if (!output.includes(oldToast)) throw new Error('P6.43 UI-00 account deletion toast missing');
  output = output.replace(oldToast, truthfulToast);

  const deleteNeedle = "globalObject.deleteAccount = () => locked('account:delete'";
  const deleteIndex = output.indexOf(deleteNeedle);
  if (deleteIndex < 0) throw new Error('P6.43 canonical account deletion mutation missing');
  output = output.slice(0, deleteIndex) + `/* ${RUNTIME_MARKER} */\n        ` + output.slice(deleteIndex);

  assertRuntime(output);
  return output;
}

function assertIndex(html) {
  const markerCount = (html.match(new RegExp(INDEX_MARKER, 'g')) || []).length;
  if (markerCount !== 1) throw new Error(`P6.43 index marker count must be 1, got ${markerCount}`);

  for (const bad of [
    'Toutes vos données seront effacées conformément au RGPD',
    'Toutes vos données personnelles seront effacées',
    'Demande de suppression envoyée — délai : 30 jours',
  ]) {
    if (html.includes(bad)) throw new Error(`P6.43 global-erasure claim remains: ${bad}`);
  }

  for (const required of [
    'Anonymiser mon compte Julvox',
    'graphe local explicitement couvert',
    'return confirmDeleteAccount();',
    'mailto:contact@julvox.com?subject=Demande RGPD Julvox',
    'Certaines données hors de ce périmètre',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.43 truthful erasure behavior missing: ${required}`);
  }
}

function assertRuntime(runtimeJs) {
  const markerCount = (runtimeJs.match(new RegExp(RUNTIME_MARKER, 'g')) || []).length;
  if (markerCount !== 1) throw new Error(`P6.43 runtime marker count must be 1, got ${markerCount}`);

  for (const required of [
    "response?.status === 200",
    "data?.status === 'anonymized'",
    "data?.scope === 'profile_and_covered_local_identity_graph'",
    'data?.full_erasure === false',
    'Profil et graphe local couvert anonymisés',
  ]) {
    if (!runtimeJs.includes(required)) throw new Error(`P6.43 runtime erasure contract missing: ${required}`);
  }

  if (runtimeJs.includes('response?.status === 204 || data?.rgpd === true')) throw new Error('P6.43 obsolete account deletion confirmation predicate remains');
  if (runtimeJs.includes('Demande de suppression enregistrée.')) throw new Error('P6.43 obsolete account deletion success toast remains');
}

function hardenArtifacts(indexHtml, runtimeJs) {
  return {
    indexHtml: hardenIndexHtml(indexHtml),
    runtimeJs: hardenRuntime(runtimeJs),
  };
}

function hardenPublicArtifact(indexPath) {
  const indexTarget = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const runtimeTarget = path.join(path.dirname(indexTarget), 'ui-00-production-truth.js');
  const hardened = hardenArtifacts(
    fs.readFileSync(indexTarget, 'utf8'),
    fs.readFileSync(runtimeTarget, 'utf8'),
  );
  fs.writeFileSync(indexTarget, hardened.indexHtml, 'utf8');
  fs.writeFileSync(runtimeTarget, hardened.runtimeJs, 'utf8');
  console.log('P6_43_ACCOUNT_ERASURE_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = {
  INDEX_MARKER,
  RUNTIME_MARKER,
  assertIndex,
  assertRuntime,
  hardenArtifacts,
  hardenIndexHtml,
  hardenPublicArtifact,
  hardenRuntime,
};
