'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-push-preferences-truth');

const fixture = `<!doctype html><html><body><script>
const NOTIF_PREFS_KEY = 'ds_notif_prefs';
const DEFAULT_NOTIFS = { deals_score90:true, alerts_price:true, flash_deals:true, newsletter:false, new_features:true, quiet_hours:true };
function getNotifPrefs() { return DEFAULT_NOTIFS; }
function saveNotifPrefs(prefs) { localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs)); }
function renderNotifsPage() {
  const prefs = getNotifPrefs();
  document.getElementById('notifsBody').innerHTML = \`<div>Score Julvox ≥ 90<input onchange="toggleNotifPref('deals_score90',this.checked)" \${prefs.deals_score90?'checked':''}><input onchange="toggleNotifPref('quiet_hours',this.checked)"></div>\`;
}
function toggleNotifPref(key, val) {
  const prefs = getNotifPrefs();
  prefs[key] = val;
  saveNotifPrefs(prefs);
  showToast(val ? '✅ Activé' : '🔕 Désactivé');
}
// ══════════════════════════════════════════════════════════════
// 6. ACCESSIBILITÉ
function initA11y() {}
async function subscribeToPush() {
  if (!swRegistration) return;
  let vapidKey = 'BFZIjtxs_NVTn-QteCxYYGYYpWtb38FSRuC49NAwtRtmUUhf2n6padi5-BPA85nH_QnPnuK2H1t4Xs010UURGuA';
  const sub = await swRegistration.pushManager.subscribe({ applicationServerKey: urlBase64ToUint8Array('BFZIjtxs_NVTn-QteCxYYGYYpWtb38FSRuC49NAwtRtmUUhf2n6padi5-BPA85nH_QnPnuK2H1t4Xs010UURGuA') });
  return sub;
}
function updateNotifBadge() {}
</script></body></html>`;

function executableInlineScripts(html) {
  const values = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const attrs = match[1] || '';
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const type = (attrs.match(/\btype=["']([^"']+)/i) || [])[1] || '';
    if (type && !['text/javascript', 'application/javascript', 'module'].includes(type)) continue;
    values.push(match[2] || '');
  }
  return values;
}

test('P6.39 removes local-only push preference confirmations and unsupported quiet hours', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.doesNotMatch(hardened, /toggleNotifPref\(/);
  assert.doesNotMatch(hardened, /ds_notif_prefs/);
  assert.doesNotMatch(hardened, /quiet_hours/);
  assert.doesNotMatch(hardened, /Score Julvox ≥ 90/);
  assert.match(hardened, /Aucun réglage serveur n’est annoncé comme modifié ici/);
});

test('P6.39 keeps push registration retriable without claiming browser permission proves backend registration', () => {
  const hardened = hardenHtml(fixture);
  assert.match(hardened, /Permission navigateur accordée/);
  assert.match(hardened, /La permission seule ne confirme pas/);
  assert.match(hardened, /Enregistrer \/ resynchroniser l’abonnement Julvox/);
  assert.match(hardened, /enableNotifPermission\(\)/);
  assert.doesNotMatch(hardened, /Ton abonnement navigateur est actif pour Julvox/);
});

test('P6.39 retires the stale hard-coded VAPID path and delegates legacy subscription to canonical authority', () => {
  const hardened = hardenHtml(fixture);
  const start = hardened.indexOf('async function subscribeToPush() {');
  const end = hardened.indexOf('function updateNotifBadge() {', start);
  const block = hardened.slice(start, end);
  assert.doesNotMatch(block, /BFZIjtxs_/);
  assert.match(block, /window\.enableNotifPermission\(\)/);
  for (const source of executableInlineScripts(hardened)) new vm.Script(source);
});

test('P6.39 is wired after P6.38 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const newsletterCall = csp.indexOf('reconcileNewsletterPreferencesTruth();');
  const pushCall = csp.indexOf('reconcilePushPreferencesTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(newsletterCall >= 0 && pushCall > newsletterCall && readCall > pushCall);
});
