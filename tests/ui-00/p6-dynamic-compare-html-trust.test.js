'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/harden-dynamic-compare-html');

const fixture = `<!doctype html><html><head></head><body><script>
// ── COMPARE ───────────────────────────────────────────────────
function runCompare() {
  const q = document.getElementById('compareInput').value.trim().toLowerCase();
  const res = document.getElementById('compareResults');
  if (!q) { showToast('⚠️ Tape un produit'); return; }
  const matches = allDeals.filter(d => d.name?.toLowerCase().includes(q) || d.brand?.toLowerCase().includes(q)).sort((a,b) => (a.current_price||0)-(b.current_price||0));
  if (!matches.length) { res.innerHTML = \`<div>Aucun résultat pour "\${q}"</div>\`; return; }
  const best = matches[0];
  res.innerHTML = \`<p>"\${q}"</p>\${matches.map(d => \`<a href="\${buildSmartUrl(d)}">Voir</a>\`).join('')}\`;
}

// ── FLASH PAGE ────────────────────────────────────────────────
function openFlashPage() {}
</script></body></html>`;

function inlineScripts(html) {
  const out = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    if (/\bsrc\s*=/i.test(match[1] || '')) continue;
    if (/type=["']application\/ld\+json["']/i.test(match[1] || '')) continue;
    out.push(match[2] || '');
  }
  return out;
}

test('P6.30 removes raw compare query and href sinks idempotently', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  const start = hardened.indexOf('// ── COMPARE');
  const end = hardened.indexOf('// ── FLASH PAGE', start);
  const block = hardened.slice(start, end);
  assert.match(block, /P6_30_DYNAMIC_COMPARE_HTML_TRUST/);
  assert.doesNotMatch(block, /\$\{q\}/);
  assert.doesNotMatch(block, /href="\$\{buildSmartUrl\(d\)\}"/);
  assert.match(block, /trust\.html\(q\)/);
  assert.match(block, /trust\.normalizeDeal\(deal, false\)/);
  assert.match(block, /trust\.httpUrl\(buildSmartUrl\(deal\)\)/);
  for (const source of inlineScripts(hardened)) new vm.Script(source);
});

test('P6.30 renders adversarial query only through HTML escaping authority', () => {
  const hardened = hardenHtml(fixture);
  const start = hardened.indexOf('// ── COMPARE');
  const end = hardened.indexOf('// ── FLASH PAGE', start);
  const block = hardened.slice(start, end);
  assert.match(block, /const q = trust\.text\(/);
  assert.match(block, /const safeQ = trust\.html\(q\)/);
  assert.doesNotMatch(block, /Aucun résultat pour "\$\{q\}"/);
  assert.doesNotMatch(block, /<strong[^>]*>"\$\{q\}"<\/strong>/);
});

test('P6.30 is wired after P6.29 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const dealCall = csp.indexOf('hardenDynamicDealHtml();');
  const promoCall = csp.indexOf('hardenDynamicPromoHtml();');
  const compareCall = csp.indexOf('hardenDynamicCompareHtml();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(dealCall >= 0 && promoCall > dealCall && compareCall > promoCall && readCall > compareCall);
});
