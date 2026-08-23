'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-cookie-consent-local-truth');

const fixture = `<!doctype html><html><body><script>
function acceptCookies(choice) {
  try { localStorage.setItem('ds_cookie', choice ? 'yes' : 'no'); } catch(e) {}
  hideCookieBanner();
  showToast(choice ? '✅ Cookies acceptés' : '✅ Cookies refusés');
  window.JULVOX_API.fetchResponse(\`\${API}/account/cookie-consent\`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({consent:{essential:true,analytics:choice},session_id:Math.random().toString(36).slice(2)})
  }).catch(()=>{});
}
function hideCookieBanner() {}
function resetCookieConsent() { localStorage.removeItem('ds_cookie'); }
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

test('P6.42 keeps cookie choice local and removes unavailable server persistence', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.doesNotMatch(hardened, /\/account\/cookie-consent/);
  assert.doesNotMatch(hardened, /✅ Cookies acceptés/);
  assert.doesNotMatch(hardened, /✅ Cookies refusés/);
  assert.doesNotMatch(hardened, /session_id:/);
  assert.match(hardened, /localStorage\.setItem\('ds_cookie', localChoice\)/);
  assert.match(hardened, /localStorage\.getItem\('ds_cookie'\) === localChoice/);
  assert.match(hardened, /Choix cookies enregistré sur cet appareil/);
});

test('P6.42 never confirms a local cookie choice when storage verification fails', () => {
  const hardened = hardenHtml(fixture);
  assert.match(hardened, /if \(!stored\)/);
  assert.match(hardened, /Impossible d’enregistrer ce choix cookies sur cet appareil/);
  assert.match(hardened, /return;/);
  assert.match(hardened, /function resetCookieConsent\(\)/);
  for (const source of executableInlineScripts(hardened)) new vm.Script(source);
});

test('P6.42 is wired after P6.41 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const favoritesCall = csp.indexOf('reconcileFavoritesLocalTruth();');
  const cookieCall = csp.indexOf('reconcileCookieConsentLocalTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(favoritesCall >= 0 && cookieCall > favoritesCall && readCall > cookieCall);
});
