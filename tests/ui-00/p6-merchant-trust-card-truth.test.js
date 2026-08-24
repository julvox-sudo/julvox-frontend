'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-merchant-trust-card-truth');

const fixture = `<!doctype html><html><body>
<script>
function ui00ResolveScore(value) { return Number.isFinite(value) ? value : null; }
const STORE_TRUST = Object.freeze({}); /* UI-00: aucune vérité marchand locale */

function dealCard(d) {
  const trust  = ui00ResolveScore(STORE_TRUST[d.store]);
  const tCls   = trust >= 95 ? 'trust-high' : trust >= 88 ? 'trust-med' : 'trust-low';
  const tLbl   = trust >= 95 ? \`✓\${trust}%\` : trust >= 88 ? \`~\${trust}%\` : \`?\${trust}%\`;
  return \`
      <div class="deal-store"><div class="store-dot"></div>\${escHtml(d.store)}<span class="deal-trust \${tCls}">\${tLbl}</span></div>\`;
}
function renderTrustDetail(deal) {
  const merchant = deal?.merchant || deal?.merchant_trust || null;
  if (!merchant || !Number.isFinite(merchant.score)) return '<div>Score marchand indisponible</div>';
  return '<div>Confiance marchand</div>';
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

test('P6.57 removes the empty local merchant-trust percentage from deal cards', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.doesNotMatch(hardened, /STORE_TRUST\[d\.store\]/);
  assert.doesNotMatch(hardened, /const STORE_TRUST = Object\.freeze/);
  assert.doesNotMatch(hardened, /deal-trust \$\{tCls\}/);
  assert.doesNotMatch(hardened, /\?\$\{trust\}%/);
  assert.match(hardened, /P6_57_MERCHANT_TRUST_CARD_TRUTH/);
});

test('P6.57 preserves merchant name and honest backend-aware trust detail fallback', () => {
  const hardened = hardenHtml(fixture);
  assert.match(hardened, /escHtml\(d\.store\)/);
  assert.match(hardened, /function renderTrustDetail\(deal\)/);
  assert.match(hardened, /deal\?\.merchant \|\| deal\?\.merchant_trust \|\| null/);
  assert.match(hardened, /Score marchand indisponible/);
  for (const source of executableInlineScripts(hardened)) new vm.Script(source);
});

test('P6.57 is wired after P6.56 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p656Call = csp.indexOf('reconcileScoreSignalTruth();');
  const p657Call = csp.indexOf('reconcileMerchantTrustCardTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p656Call >= 0 && p657Call > p656Call && readCall > p657Call);
});
