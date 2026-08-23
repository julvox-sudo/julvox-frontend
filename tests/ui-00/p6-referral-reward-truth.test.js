'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-referral-reward-truth');

const fixture = `<!doctype html><html><body><script>
async function openReferralPage() {
  let code = null, uses = 0, earned = 0;
  const d = {code:'SAFE1234',uses:2};
  code = d.code; uses = d.uses; earned = d.earned || uses * 7;
  if (!code) {
    // Code local
    code = btoa(currentUser.email).substring(0,8).toUpperCase();
  }
  const refLink = window.location.origin + '?ref=' + code;
  document.body.innerHTML = \`<div>Invite & Gagne Premium · 7 jours Premium<button onclick="copyRefCode('\${code}','\${refLink}')">Copier</button></div>\`;
  await window.JULVOX_API.fetchResponse(\`\${API}/referral/use/\${code}\`, {method:'POST'});
}
function copyRefCode(code, link) { return navigator.clipboard.writeText(link); }
async function applyReferralCode(code) { return code; }
// Vérifier code parrainage au chargement
document.addEventListener('DOMContentLoaded', () => {
  const ref = new URLSearchParams(window.location.search).get('ref');
  if (ref && currentUser) setTimeout(() => applyReferralCode(ref), 1000);
  const premium = new URLSearchParams(window.location.search).get('premium');
  if (premium === 'success' && currentUser && currentUser.token) { currentUser.is_premium = true; }
});
async function startup() {
  const ref = new URLSearchParams(window.location.search).get('ref');
  if (ref && currentUser) setTimeout(() => applyReferralCode(ref), 1000);
}
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

test('P6.40 removes invented referral rewards and local code fallback', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.doesNotMatch(hardened, /uses \* 7/);
  assert.doesNotMatch(hardened, /btoa\(currentUser\.email\)/);
  assert.doesNotMatch(hardened, /Invite & Gagne Premium/);
  assert.doesNotMatch(hardened, /7 jours Premium/);
  assert.doesNotMatch(hardened, /\/referral\/use\//);
  assert.match(hardened, /Parrainage temporairement suspendu/);
  assert.match(hardened, /Aucun code local n’a été fabriqué/);
});

test('P6.40 requires durable backend referral state and renders a bounded code', () => {
  const hardened = hardenHtml(fixture);
  assert.match(hardened, /\/referral\/stats/);
  assert.match(hardened, /\/referral\/generate/);
  assert.match(hardened, /suspended_pending_durable_entitlement/);
  assert.match(hardened, /\^\[A-Z0-9_-\]\{1,32\}\$/);
  assert.match(hardened, /trust\.html\(state\.code\)/);
  assert.match(hardened, /data-ref-copy/);
  assert.doesNotMatch(hardened, /onclick="copyRefCode/);
});

test('P6.40 disables both automatic referral reward applications while preserving payment verification', () => {
  const hardened = hardenHtml(fixture);
  assert.doesNotMatch(hardened, /if \(ref && currentUser\) setTimeout\(\(\) => applyReferralCode\(ref\), 1000\);/);
  assert.match(hardened, /if \(premium === 'success' && currentUser && currentUser\.token\)/);
  assert.match(hardened, /Aucun code n’a été appliqué/);
  for (const source of executableInlineScripts(hardened)) new vm.Script(source);
});

test('P6.40 is wired after P6.39 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const pushCall = csp.indexOf('reconcilePushPreferencesTruth();');
  const referralCall = csp.indexOf('reconcileReferralRewardTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(pushCall >= 0 && referralCall > pushCall && readCall > referralCall);
});
