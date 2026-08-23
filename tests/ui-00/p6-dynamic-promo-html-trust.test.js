'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const { RUNTIME, hardenHtml } = require('../../scripts/harden-dynamic-promo-html');

function runtimeAuthority() {
  const source = RUNTIME.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  new vm.Script(source, { filename: 'p6-29-runtime.js' }).runInContext(sandbox);
  return sandbox.window.JulvoxDynamicPromoTrust;
}

test('P6.29 rejects executable promo IDs and normalizes API scalars', () => {
  const trust = runtimeAuthority();
  assert.equal(trust.normalizePromo({ id: '1);globalThis.pwned=1;//', store: 'Shop', code: 'SAVE' }), null);
  const promo = trust.normalizePromo({
    id: 17,
    store: '<img src=x onerror=1>',
    code: "X'Y",
    emoji: '<svg/onload=1>',
    votes_ok: '5',
    votes_ko: '2',
    user_vote: 'evil',
  });
  assert.equal(promo.id, 17);
  assert.equal(promo.votes_ok, 5);
  assert.equal(promo.votes_ko, 2);
  assert.equal(promo.user_vote, null);
  assert.match(trust.html(promo.emoji), /&lt;svg/);
});

function fixture() {
  return `<!doctype html><html><head><script id="julvox-p6-28-dynamic-deal-html-trust"></script></head><body><script>
const _STATIC_PROMOS = [];
let _allPromos      = [..._STATIC_PROMOS];
let _promoVotes = {};
async function loadAndRenderPromos() {
  const grid = document.getElementById('promoGrid');
  if (grid) grid.innerHTML = 'loading';
  try {
    const r = await fetch('/promos');
    if (r.ok) {
      const d = await r.json();
      const community = (d.codes || []).map(p => ({...p, source: p.source || 'community'}));
      _allPromos = community.length ? community : [..._STATIC_PROMOS];
      community.forEach(p => { if (p.user_vote) _promoVotes[p.id] = p.user_vote; });
    }
  } catch(e) { _allPromos = [..._STATIC_PROMOS]; }
  renderPromoStats();
  renderPromoGrid();
}
function renderPromoStats() {}
function renderPromoCard(p) {
  const total      = (p.votes_ok||0) + (p.votes_ko||0);
  const pct        = total > 0 ? Math.round((p.votes_ok||0) / total * 100) : null;
  const voted      = _promoVotes[p.id] || p.user_vote;
  const isVerified = p.source === 'verified' || p.is_verified;
  const storeEmoji = p.emoji || getStoreEmoji(p.store);
  const isOwn      = currentUser && p.submitted_by === currentUser?.uid;
  return \`<span>\${storeEmoji}</span>
    <button class="promo-copy" onclick="copyPromo('\${escHtml(p.code)}',this)">Copier</button>
    <button onclick="sharePromo('\${escHtml(p.code)}','\${escHtml(p.store)}')">share</button>
    <button onclick="votePromo(\${p.id},'ok',this)">\${p.votes_ok||0}</button>
    <button onclick="votePromo(\${p.id},'ko',this)">\${p.votes_ko||0}</button>\`;
}
function filterPromos(text) {}
</script></body></html>`;
}

test('P6.29 removes promo data from inline JavaScript contexts', () => {
  const hardened = hardenHtml(fixture());
  assert.match(hardened, /JulvoxDynamicPromoTrust\.normalizeList/);
  assert.match(hardened, /JulvoxDynamicPromoTrust\.copyById\(\$\{safeId\},this\)/);
  assert.match(hardened, /JulvoxDynamicPromoTrust\.shareById\(\$\{safeId\}\)/);
  assert.match(hardened, /votePromo\(\$\{safeId\},'ok'/);
  assert.doesNotMatch(hardened, /copyPromo\('\$\{escHtml\(p\.code\)\}/);
  assert.doesNotMatch(hardened, /sharePromo\('\$\{escHtml\(p\.code\)\}/);
  assert.doesNotMatch(hardened, /votePromo\(\$\{p\.id\}/);
  assert.equal(hardenHtml(hardened), hardened);

  const scripts = [...hardened.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(match => !/type=["']application\/ld\+json["']/i.test(match[1] || ''))
    .map(match => match[2]);
  scripts.forEach((source, index) => assert.doesNotThrow(
    () => new vm.Script(source, { filename: `promo-fixture-${index}.js` }),
  ));
});

test('P6.29 runs after P6.28 and before CSP hashes the final artifact', () => {
  const cspSource = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  assert.match(cspSource, /require\('\.\/harden-dynamic-promo-html'\)/);
  const dealCall = cspSource.indexOf('hardenDynamicDealHtml();');
  const promoCall = cspSource.indexOf('hardenDynamicPromoHtml();');
  const indexRead = cspSource.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(dealCall >= 0);
  assert.ok(promoCall > dealCall);
  assert.ok(indexRead > promoCall);
});
