'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_39_PUSH_PREFERENCES_TRUTH';
const PREFS_START = "const NOTIF_PREFS_KEY = 'ds_notif_prefs';";
const PREFS_END = '// 6. ACCESSIBILITÉ';
const LEGACY_PUSH_START = 'async function subscribeToPush() {';
const LEGACY_PUSH_END = 'function updateNotifBadge() {';

const TRUTHFUL_PREFS_BLOCK = `// ${MARKER}
function renderNotifsPage() {
  const body = document.getElementById('notifsBody');
  if (!body) return;
  const supported = 'Notification' in window && !!navigator.serviceWorker;
  const permission = supported ? Notification.permission : 'unsupported';
  const granted = permission === 'granted';
  body.innerHTML = \`
    <div style="padding:20px">
      \${!supported ? \`
        <div style="background:rgba(255,59,48,.08);border:1px solid rgba(255,59,48,.2);border-radius:14px;padding:16px;font-size:12px;color:var(--txt2)">
          Les notifications push ne sont pas prises en charge par ce navigateur.
        </div>\` : !granted ? \`
        <div style="background:rgba(255,184,0,.1);border:1px solid rgba(255,184,0,.3);border-radius:14px;padding:16px;margin-bottom:16px;text-align:center">
          <div style="font-size:20px;margin-bottom:8px">🔔</div>
          <div style="font-size:14px;font-weight:600;margin-bottom:6px">Activer les notifications push</div>
          <div style="font-size:12px;color:var(--txt2);margin-bottom:12px">Julvox utilisera la clé de notification courante fournie par le service.</div>
          <button onclick="enableNotifPermission()" style="background:var(--accent);color:#fff;border:none;border-radius:10px;padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer">Activer</button>
        </div>\` : \`
        <div style="background:rgba(0,208,132,.06);border:1px solid rgba(0,208,132,.15);border-radius:14px;padding:16px;margin-bottom:14px">
          <div style="font-size:14px;font-weight:700;color:var(--green);margin-bottom:5px">✅ Permission navigateur accordée</div>
          <div style="font-size:12px;color:var(--txt2);margin-bottom:12px">La permission seule ne confirme pas que l’abonnement est actuellement enregistré côté Julvox.</div>
          <button onclick="enableNotifPermission()" style="background:var(--accent);color:#fff;border:none;border-radius:10px;padding:9px 14px;font-size:12px;font-weight:600;cursor:pointer">Enregistrer / resynchroniser l’abonnement Julvox</button>
        </div>\`}
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:12px 14px;font-size:12px;color:var(--txt2);line-height:1.45">
        La personnalisation détaillée des types de notifications et des heures calmes n’est pas encore synchronisée avec ton abonnement Julvox sur cette page. Aucun réglage serveur n’est annoncé comme modifié ici.
      </div>
    </div>\`;
}

`;

function hardenHtml(html) {
  if (html.includes(`// ${MARKER}`)) {
    assertHardened(html);
    return html;
  }

  let output = html;
  const prefsStart = output.indexOf(PREFS_START);
  const prefsEnd = output.indexOf(PREFS_END, prefsStart + PREFS_START.length);
  if (prefsStart < 0 || prefsEnd < 0 || prefsEnd <= prefsStart) {
    throw new Error('P6.39 push preferences anchors missing');
  }

  const legacyPrefs = output.slice(prefsStart, prefsEnd);
  for (const required of [
    'function renderNotifsPage()',
    'function toggleNotifPref(key, val)',
    'saveNotifPrefs(prefs)',
    'prefs[key] = val',
    'quiet_hours',
    'deals_score90',
  ]) {
    if (!legacyPrefs.includes(required)) {
      throw new Error(`P6.39 expected legacy push preference behavior missing: ${required}`);
    }
  }
  output = output.slice(0, prefsStart) + TRUTHFUL_PREFS_BLOCK + output.slice(prefsEnd);

  const legacyPushStart = output.indexOf(LEGACY_PUSH_START);
  const legacyPushEnd = output.indexOf(LEGACY_PUSH_END, legacyPushStart + LEGACY_PUSH_START.length);
  if (legacyPushStart < 0 || legacyPushEnd < 0 || legacyPushEnd <= legacyPushStart) {
    throw new Error('P6.39 legacy push subscription anchors missing');
  }
  const legacyPush = output.slice(legacyPushStart, legacyPushEnd);
  if (!legacyPush.includes('BFZIjtxs_NVTn-QteCxYYGYYpWtb38FSRuC49NAwtRtmUUhf2n6padi5-BPA85nH_QnPnuK2H1t4Xs010UURGuA')) {
    throw new Error('P6.39 expected hard-coded legacy VAPID key missing');
  }

  const delegate = `async function subscribeToPush() {
  if (typeof window.enableNotifPermission !== 'function') return null;
  return window.enableNotifPermission();
}

`;
  output = output.slice(0, legacyPushStart) + delegate + output.slice(legacyPushEnd);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const markerCount = (html.match(new RegExp(MARKER, 'g')) || []).length;
  if (markerCount !== 1) throw new Error(`P6.39 marker count must be 1, got ${markerCount}`);

  const prefsStart = html.indexOf(`// ${MARKER}`);
  const prefsEnd = html.indexOf(PREFS_END, prefsStart);
  if (prefsStart < 0 || prefsEnd < 0) throw new Error('P6.39 truthful preference block missing');
  const prefsBlock = html.slice(prefsStart, prefsEnd);

  for (const bad of [
    'toggleNotifPref(',
    'ds_notif_prefs',
    'quiet_hours',
    'Score Julvox ≥ 90',
    'prefs[key] = val',
    'saveNotifPrefs(',
    'Ton abonnement navigateur est actif pour Julvox',
    'Notifications push activées',
  ]) {
    if (prefsBlock.includes(bad)) throw new Error(`P6.39 misleading preference state remains: ${bad}`);
  }
  for (const required of [
    'enableNotifPermission()',
    'Permission navigateur accordée',
    'La permission seule ne confirme pas',
    'Enregistrer / resynchroniser l’abonnement Julvox',
    'personnalisation détaillée',
    'Aucun réglage serveur n’est annoncé comme modifié ici',
  ]) {
    if (!prefsBlock.includes(required)) throw new Error(`P6.39 missing ${required}`);
  }

  const legacyPushStart = html.indexOf(LEGACY_PUSH_START);
  const legacyPushEnd = html.indexOf(LEGACY_PUSH_END, legacyPushStart);
  if (legacyPushStart < 0 || legacyPushEnd < 0) throw new Error('P6.39 subscription delegate missing');
  const legacyPush = html.slice(legacyPushStart, legacyPushEnd);
  if (legacyPush.includes('BFZIjtxs_')) throw new Error('P6.39 hard-coded VAPID key remains in legacy subscription path');
  if (!legacyPush.includes('window.enableNotifPermission()')) throw new Error('P6.39 legacy subscription does not delegate to canonical authority');
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_39_PUSH_PREFERENCES_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
