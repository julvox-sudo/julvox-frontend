'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-compare-merchant-trust-truth');

const fixture = `<!doctype html><html><body>
<script>
function ui00NumericScore(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
async function loadProductComparison(productId) {
  return window.JULVOX_API.get('/products/' + encodeURIComponent(productId) + '/compare');
}
function renderProductComparison(data, el) {
  el.innerHTML = data.comparisons.map(c => \`
        <div class="compare-row">
          <span>\${c.store}</span>
          <span>\${c.price}€</span>
          <span>\${c.vs_best > 0 ? '+' + c.vs_best : 'meilleur prix'}</span>
          <div class="compare-trust">
            <span style="color:\${c.trust_score>=90?'var(--green)':'var(--gold)'}">★ \${c.trust_score}</span>
            <span style="color:var(--txt3)">confiance</span>
            \${c.novadeal_score ? \`<span style="color:var(--txt3)">· Julvox \${c.novadeal_score}</span>\` : ''}
          </div>
        </div>\`).join('');
}
</script>
</body></html>`;

function executableInlineScripts(html) {
  const scripts = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const attrs = match[1] || '';
    if (/\bsrc\s*=/i.test(attrs)) continue;
    scripts.push(match[2] || '');
  }
  return scripts;
}

test('P6.58 removes static merchant trust from active product comparison', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.doesNotMatch(hardened, /c\.trust_score>=90/);
  assert.doesNotMatch(hardened, /★ \$\{c\.trust_score\}/);
  assert.doesNotMatch(hardened, />confiance</);
  assert.match(hardened, /P6_58_COMPARE_MERCHANT_TRUST_TRUTH/);
});

test('P6.58 preserves factual price comparison and treats Julvox score only as a signal', () => {
  const hardened = hardenHtml(fixture);
  assert.match(hardened, /function renderProductComparison\(data, el\)/);
  assert.match(hardened, /JULVOX_API\.get\('\/products\/' \+ encodeURIComponent\(productId\) \+ '\/compare'/);
  assert.match(hardened, /\$\{c\.price\}€/);
  assert.match(hardened, /\$\{c\.store\}/);
  assert.match(hardened, /\$\{c\.vs_best > 0/);
  assert.match(hardened, /Score Julvox indisponible/);
  assert.match(hardened, /Score Julvox \$\{ui00NumericScore\(c\.novadeal_score\)\}\/100/);
  for (const source of executableInlineScripts(hardened)) new vm.Script(source);
});

test('P6.58 is wired after P6.57 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p657Call = csp.indexOf('reconcileMerchantTrustCardTruth();');
  const p658Call = csp.indexOf('reconcileCompareMerchantTrustTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p657Call >= 0 && p658Call > p657Call && readCall > p658Call);
});
