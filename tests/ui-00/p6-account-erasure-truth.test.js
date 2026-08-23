'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenArtifacts } = require('../../scripts/reconcile-account-erasure-truth');

const indexFixture = `<!doctype html><html><body>
<div style="font-size:13px;color:var(--txt2);margin-bottom:8px">🗑️ Demander la suppression de mon compte et mes données :</div>
<button>Supprimer mon compte et mes données</button>
<div>La suppression de votre compte est irréversible. Toutes vos données seront effacées conformément au RGPD (Art. 17).</div>
<script>
function requestAccountDeletion() {
  const msg = "delete everything";
  window.JULVOX_API.fetchResponse(API + '/account/delete', {method:'DELETE'}).then(r => r.json()).then(() => showToast('✅ Demande de suppression envoyée — délai : 30 jours'));
}
// ── AUTH ──
function confirmDeleteAccount() {
  const confirmed = confirm('⚠️ Supprimer votre compte ?\\n\\nCette action est irréversible. Toutes vos données personnelles seront effacées (RGPD Art. 17).\\n\\nConfirmer ?');
  if (!confirmed) return;
  deleteAccount();
}



// ══════════════════════════════════════════════════════════════
// 1. ONBOARDING ANIMÉ
</script></body></html>`;

const runtimeFixture = `(function(){
  const globalObject = {};
  const locked = (key, fn) => fn;
  const client = { delete: async () => ({ok:true}) };
  const token = () => 'token';
  const toast = () => {};
  const errorMessage = () => 'error';
  globalObject.currentUser = {token:'token'};
  globalObject.deleteAccount = () => locked('account:delete', async () => {
    if (!globalObject.currentUser) return null;
    const result = await client.delete('/account/delete', { token: token(), confirm: (data, response) => response?.status === 204 || data?.rgpd === true });
    if (!result.ok) return toast('failed'), result;
    globalObject.logout?.();
    globalObject.closePage?.('accountPage');
    toast('✅ Demande de suppression enregistrée.');
    return result;
  });
})();`;

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

test('P6.43 aligns the canonical delete confirmation with the exact backend anonymization contract', () => {
  const hardened = hardenArtifacts(indexFixture, runtimeFixture);
  const second = hardenArtifacts(hardened.indexHtml, hardened.runtimeJs);
  assert.equal(second.indexHtml, hardened.indexHtml);
  assert.equal(second.runtimeJs, hardened.runtimeJs);

  assert.match(hardened.runtimeJs, /response\?\.status === 200/);
  assert.match(hardened.runtimeJs, /data\?\.status === 'anonymized'/);
  assert.match(hardened.runtimeJs, /data\?\.scope === 'profile_and_covered_local_identity_graph'/);
  assert.match(hardened.runtimeJs, /data\?\.full_erasure === false/);
  assert.doesNotMatch(hardened.runtimeJs, /status === 204 \|\| data\?\.rgpd === true/);
  assert.match(hardened.runtimeJs, /Profil et graphe local couvert anonymisés/);
});

test('P6.43 removes global-erasure promises from both public account-deletion entrypoints', () => {
  const hardened = hardenArtifacts(indexFixture, runtimeFixture);
  assert.doesNotMatch(hardened.indexHtml, /Toutes vos données seront effacées conformément au RGPD/);
  assert.doesNotMatch(hardened.indexHtml, /Toutes vos données personnelles seront effacées/);
  assert.doesNotMatch(hardened.indexHtml, /Demande de suppression envoyée — délai : 30 jours/);
  assert.match(hardened.indexHtml, /Anonymiser mon compte Julvox/);
  assert.match(hardened.indexHtml, /graphe local explicitement couvert/);
  assert.match(hardened.indexHtml, /return confirmDeleteAccount\(\);/);
  assert.match(hardened.indexHtml, /mailto:contact@julvox\.com\?subject=Demande RGPD Julvox/);
  for (const source of executableInlineScripts(hardened.indexHtml)) new vm.Script(source);
  new vm.Script(hardened.runtimeJs);
});

test('P6.43 is wired after P6.42 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const cookieCall = csp.indexOf('reconcileCookieConsentLocalTruth();');
  const erasureCall = csp.indexOf('reconcileAccountErasureTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(cookieCall >= 0 && erasureCall > cookieCall && readCall > erasureCall);
});
