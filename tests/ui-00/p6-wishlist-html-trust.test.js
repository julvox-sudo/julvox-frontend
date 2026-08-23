'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/harden-wishlist-html');

const fixture = `<!doctype html><html><body><script>
function renderWishlistItems(items, el) {
  if (!items.length) { el.innerHTML = '<div>Vide</div>'; return; }
  el.innerHTML = items.map(item => \`<div><span>\${item.name}</span><small>\${item.best_store}</small><button onclick="openDealById(\${item.deal_id})">Voir</button><button onclick="removeFromWishlist(\${item.id})">X</button></div>\`).join('');
}
async function openDealById(dealId) {}
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

test('P6.34 removes raw wishlist text and dynamic inline handlers', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  const start = hardened.indexOf('// P6_34_WISHLIST_HTML_TRUST');
  const end = hardened.indexOf('async function openDealById', start);
  const block = hardened.slice(start, end);
  assert.doesNotMatch(block, /\$\{item\.name\}/);
  assert.doesNotMatch(block, /\$\{item\.best_store\}/);
  assert.doesNotMatch(block, /onclick="openDealById/);
  assert.doesNotMatch(block, /onclick="removeFromWishlist/);
  assert.match(block, /trust\.html\(item\.name\)/);
  assert.match(block, /data-wishlist-open-deal/);
  assert.match(block, /data-wishlist-remove/);
  assert.match(block, /button\.addEventListener\('click'/);
  for (const source of inlineScripts(hardened)) new vm.Script(source);
});

test('P6.34 normalizes wishlist ids, text and prices before rendering', () => {
  const hardened = hardenHtml(fixture);
  assert.match(hardened, /trust\.positiveId\(item && item\.id\)/);
  assert.match(hardened, /trust\.positiveId\(item && item\.deal_id\)/);
  assert.match(hardened, /trust\.text\(item && item\.name, 240\)/);
  assert.match(hardened, /Number\.isFinite\(number\) && number > 0/);
});

test('P6.34 is wired after P6.33 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const budgetCall = csp.indexOf('hardenBudgetDealHtml();');
  const wishlistCall = csp.indexOf('hardenWishlistHtml();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(budgetCall >= 0 && wishlistCall > budgetCall && readCall > wishlistCall);
});
