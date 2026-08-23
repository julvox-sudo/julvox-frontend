'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-favorites-local-truth');

const fixture = `<!doctype html><html><body>
<div class="page" id="favPage"><div class="page-body"><div id="favGrid" class="deals" style="padding:0"></div></div></div>
<script>
let favorites = new Set();
try { favorites = new Set(JSON.parse(localStorage.getItem('ds_favs') || '[]')); } catch(e) {}
function toggleFav(id) { favorites.add(id); localStorage.setItem('ds_favs', JSON.stringify([...favorites])); }
function openFavPage() { return [...favorites]; }
function renderLoginForm(){ document.body.innerHTML = '<div>Retrouve tes favoris sur tous tes appareils</div>'; }
function renderSignupForm(){ document.body.innerHTML = '<div>Gratuit · Favoris synchronisés · Alertes prix</div><div>✅ Favoris sync</div>'; }
function openPremiumPage(){ document.body.innerHTML = '<div>✅ Favoris synchronisés</div>'; }
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

test('P6.41 removes false cross-device favorites synchronization claims', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.doesNotMatch(hardened, /Favoris synchronisés/);
  assert.doesNotMatch(hardened, /Favoris sync/);
  assert.doesNotMatch(hardened, /favoris sur tous tes appareils/);
  assert.match(hardened, /Tes favoris sont enregistrés uniquement sur cet appareil/);
  assert.match(hardened, /La synchronisation entre appareils n’est pas encore disponible/);
  assert.match(hardened, /Gratuit · Favoris locaux · Alertes prix/);
  assert.match(hardened, /✅ Favoris sur cet appareil/);
});

test('P6.41 preserves local favorites behavior without inventing a server sync route', () => {
  const hardened = hardenHtml(fixture);
  assert.match(hardened, /localStorage\.getItem\('ds_favs'/);
  assert.match(hardened, /localStorage\.setItem\('ds_favs'/);
  assert.match(hardened, /function toggleFav\(id\)/);
  assert.match(hardened, /function openFavPage\(\)/);
  assert.doesNotMatch(hardened, /\/account\/favorites/);
  for (const source of executableInlineScripts(hardened)) new vm.Script(source);
});

test('P6.41 is wired after P6.40 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const referralCall = csp.indexOf('reconcileReferralRewardTruth();');
  const favoritesCall = csp.indexOf('reconcileFavoritesLocalTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(referralCall >= 0 && favoritesCall > referralCall && readCall > favoritesCall);
});
