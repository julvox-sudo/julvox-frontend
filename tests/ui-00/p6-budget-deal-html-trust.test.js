'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/harden-budget-deal-html');

const fixture = `<!doctype html><html><body><script>
function renderBudgetResults(data, el) {
  if (!data.deals?.length) { el.innerHTML = '<div>Aucun deal</div>'; return; }
  el.innerHTML = \`<div>\${data.total_price}€</div>\${data.deals.map((d, i) => \`<div onclick="openDeal(\${JSON.stringify(d).replace(/"/g,'&quot;')})"><img src="\${d.image_url}"><span>\${d.name}</span><small>\${d.store}</small><b>\${d.current_price}€</b></div>\`).join('')}\`;
}
// ── WISHLIST ──────────────────────────────────────────────────
function openWishlist() {}
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

test('P6.33 removes serialized deal handlers and raw deal HTML sinks', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  const start = hardened.indexOf('// P6_33_BUDGET_DEAL_HTML_TRUST');
  const end = hardened.indexOf('// ── WISHLIST', start);
  const block = hardened.slice(start, end);
  assert.doesNotMatch(block, /JSON\.stringify\(d\)/);
  assert.doesNotMatch(block, /onclick="openDeal/);
  assert.doesNotMatch(block, /\$\{d\.name\}/);
  assert.doesNotMatch(block, /\$\{d\.store\}/);
  assert.match(block, /trust\.normalizeDeal\(deal, false\)/);
  assert.match(block, /trust\.httpUrl\(deal\.image_url \|\| ''\)/);
  assert.match(block, /trust\.html\(deal\.name\)/);
  assert.match(block, /row\.addEventListener\('click'/);
  for (const source of inlineScripts(hardened)) new vm.Script(source);
});

test('P6.33 normalizes budget scalars before rendering', () => {
  const hardened = hardenHtml(fixture);
  assert.match(hardened, /Number\.isFinite\(number\)/);
  assert.match(hardened, /Math\.max\(0, finite\(payload\.total_price, 0\)\)/);
  assert.match(hardened, /Math\.max\(0, Math\.min\(100, finite\(payload\.efficiency, 0\)\)\)/);
});

test('P6.33 is wired after P6.32 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const accountCall = csp.indexOf('hardenAccountHtml();');
  const budgetCall = csp.indexOf('hardenBudgetDealHtml();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(accountCall >= 0 && budgetCall > accountCall && readCall > budgetCall);
});
