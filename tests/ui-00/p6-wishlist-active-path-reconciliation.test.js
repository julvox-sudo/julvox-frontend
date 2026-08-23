'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-wishlist-active-path');

const fixture = `<!doctype html><html><body>
<button class="sort-btn" onclick="openPage('wishlistPage');typeof loadWishlist==='function'&&loadWishlist()">❤️ Wishlist</button>
<div id="wishlistPage"><input id="wishProductName"><input id="wishTargetPrice"><div id="wishlistContent"></div></div>
<script>
async function openWishlist() { openPage('wishlistPage'); loadWishlistItems(); }
async function loadWishlistItems() {
  const el = document.getElementById('wishlistItems');
  const result = await window.JULVOX_API.get('/wishlist', { isEmpty: data => !Array.isArray(data?.items) || data.items.length === 0 });
  renderWishlistItems(result.data.items, el);
}
function renderWishlistItems(items, el) { el.innerHTML = '<button data-wishlist-remove="1">X</button>'; }
async function loadWishlist() {
  const el = document.getElementById('wishlistContent');
  const result = await window.JULVOX_API.get('/wishlist', { isEmpty: data => !Array.isArray(data?.wishlist) || data.wishlist.length === 0 });
  renderWishlist(result.data.wishlist, el);
}
function renderWishlist(items, el) {
  el.innerHTML = items.map(item => \`<div>\${item.product_name}<span>\${item.best_store}</span><button onclick="openDeal({id:\${item.best_deal_id},name:'\${item.product_name}',current_price:\${item.best_price||0},store:'\${item.best_store||''}',novadeal_score:0})">Voir</button><button onclick="removeFromWishlist(\${item.id})">X</button></div>\`).join('');
}
// ── MODE BUDGET ───────────────────────────────────────────────
function budget() {}
</script></body></html>`;

function inlineScripts(html) {
  const values = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    if (/\bsrc\s*=/i.test(match[1] || '')) continue;
    values.push(match[2] || '');
  }
  return values;
}

test('P6.36 routes the visible wishlist through the canonical items loader', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.match(hardened, /onclick="openWishlist\(\)"/);
  assert.match(hardened, /id="wishlistItems"/);
  assert.match(hardened, /data => !Array\.isArray\(data\?\.items\)/);
  assert.match(hardened, /renderWishlistItems\(result\.data\.items, el\)/);
  assert.doesNotMatch(hardened, /data\?\.wishlist/);
  assert.doesNotMatch(hardened, /result\.data\.wishlist/);
});

test('P6.36 aligns form and refresh ids with production-truth actions', () => {
  const hardened = hardenHtml(fixture);
  const truth = fs.readFileSync(path.join(__dirname, '..', '..', 'ui-00-production-truth.js'), 'utf8');
  assert.match(hardened, /id="wishName"/);
  assert.match(hardened, /id="wishTargetPrice"/);
  assert.match(hardened, /id="wishlistItems"/);
  assert.match(truth, /getElementById\('wishName'\)/);
  assert.match(truth, /getElementById\('wishTargetPrice'\)/);
  assert.match(truth, /globalObject\.loadWishlistItems\?\.\(\)/);
  assert.match(truth, /globalObject\.removeFromWishlist = id/);
});

test('P6.36 retires legacy wishlist JS serialization and delegates rendering', () => {
  const hardened = hardenHtml(fixture);
  assert.doesNotMatch(hardened, /\$\{item\.product_name\}/);
  assert.doesNotMatch(hardened, /onclick="openDeal\(\{id:\$\{item\.best_deal_id\}/);
  assert.match(hardened, /return loadWishlistItems\(\);/);
  assert.match(hardened, /return renderWishlistItems\(items, el\);/);
  for (const source of inlineScripts(hardened)) new vm.Script(source);
});

test('P6.36 is wired after P6.35 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const communityCall = csp.indexOf('hardenCommunityClaimHtml();');
  const wishlistActiveCall = csp.indexOf('reconcileWishlistActivePath();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(communityCall >= 0 && wishlistActiveCall > communityCall && readCall > wishlistActiveCall);
});
