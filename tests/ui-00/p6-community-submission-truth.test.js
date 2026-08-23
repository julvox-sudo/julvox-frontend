'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-community-submission-truth');

const fixture = `<!doctype html><html><body>
<div>Partage un bon deal avec la communauté. Le score Julvox sera calculé automatiquement.</div>
<input id="sdName"><input id="sdPrice"><input id="sdOriginal"><input id="sdStore"><select id="sdCat"></select><input id="sdUrl"><textarea id="sdDesc"></textarea>
<button onclick="submitCommunityDealNew()" style="width:100%;background:linear-gradient(135deg,var(--accent),var(--a2));color:#fff;border:none;border-radius:12px;padding:14px;font-size:14px;font-weight:700;cursor:pointer;font-family:'Syne',sans-serif">
        🚀 Publier le deal
      </button>
<div>Les deals sont vérifiés par Julvox avant publication.</div>
<script>
let currentUser = { token: 'token' };
function showToast() {}
function switchCommTab() {}
function closeSubmitDeal(e) {
  if (!e || e.target === document.getElementById('submitDealOverlay') || !e.target) {
    document.getElementById('submitDealOverlay').classList.remove('open');
  }
}
</script>
<script>
(function injectMetaTags(){
const metas = [
['property','og:title','Julvox by Julvox — Deals vérifiés Julvox']
];
return metas;
})();
</script>
</body></html>`;

function executableInlineScripts(html) {
  const scripts = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const attrs = match[1] || '';
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const typeMatch = attrs.match(/\btype\s*=\s*["']([^"']+)["']/i);
    if (typeMatch && !['text/javascript', 'application/javascript', 'module'].includes(typeMatch[1].toLowerCase())) continue;
    scripts.push(match[2] || '');
  }
  return scripts;
}

test('P6.48 restores one truthful authenticated community submission runtime', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.equal((hardened.match(/async function submitCommunityDealNew\s*\(/g) || []).length, 1);
  assert.match(hardened, /window\.JULVOX_API\.post\('\/community\/submit-deal'/);
  assert.match(hardened, /token,/);
  assert.match(hardened, /data\?\.status === 'pending'/);
  assert.match(hardened, /Number\(data\?\.score\) === 0/);
  assert.match(hardened, /_communitySubmitBusy/);
  assert.match(hardened, /switchCommTab\('mine'\)/);
});

test('P6.48 removes publication, automatic-score and Julvox-verification claims', () => {
  const hardened = hardenHtml(fixture);
  assert.doesNotMatch(hardened, /Le score Julvox sera calculé automatiquement/);
  assert.doesNotMatch(hardened, /🚀 Publier le deal/);
  assert.doesNotMatch(hardened, /Les deals sont vérifiés par Julvox avant publication/);
  assert.doesNotMatch(hardened, /Deals vérifiés Julvox/);
  assert.match(hardened, /🚀 Soumettre le deal/);
  assert.match(hardened, /validation communautaire/);
  assert.match(hardened, /aucun score Julvox n’est inventé/);
  assert.match(hardened, /Deals et offres analysés par Julvox/);
});

test('P6.48 preserves executable inline JavaScript syntax', () => {
  const hardened = hardenHtml(fixture);
  for (const source of executableInlineScripts(hardened)) new vm.Script(source);
});

test('P6.48 is wired after P6.47 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const privacyCall = csp.indexOf('reconcilePrivacyRetentionTruth();');
  const communityCall = csp.indexOf('reconcileCommunitySubmissionTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(privacyCall >= 0 && communityCall > privacyCall && readCall > communityCall);
});
