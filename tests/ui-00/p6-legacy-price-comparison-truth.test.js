'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-legacy-price-comparison-truth');

const legacyPage = `<!-- ══════════════════════════════════════════════════════════
     COMPARATEUR AMÉLIORÉ v2
══════════════════════════════════════════════════════════ -->
<div class="page" id="comparePageV2">
  <div class="page-head">
    <button class="page-back" onclick="closePage('comparePageV2')">← Retour</button>
    <div class="page-title">🔍 Comparateur</div>
  </div>
  <div class="page-body">
    <div class="analyze-wrap">
      <input class="analyze-input" type="text" id="compareV2Input" placeholder="Rechercher un produit à comparer…" onkeydown="if(event.key==='Enter')runCompareV2()"/>
      <button class="analyze-btn" style="margin-top:10px" onclick="runCompareV2()">🔍 Comparer les prix</button>
    </div>
    <div id="compareV2Results"></div>
  </div>
</div>`;

const legacyRun = `async function runCompareV2() {
  const q = document.getElementById('compareV2Input')?.value?.trim();
  const resEl = document.getElementById('compareV2Results');
  if (!resEl) return;
  if (!q || q.length < 2) { showToast('⚠️ Entre un nom de produit'); return; }
  resEl.textContent = 'Recherche en cours…';
  const result = await window.JULVOX_API.get('/search/compare?q=' + encodeURIComponent(q), {
    isEmpty: data => !Array.isArray(data?.results) || data.results.length === 0,
  });
  if (!result.ok) {
    window.JULVOX_PRODUCTION_TRUTH.renderState(resEl, 'error', result.message || 'Comparaison indisponible.', runCompareV2);
    return;
  }
  if (result.kind === 'empty') {
    window.JULVOX_PRODUCTION_TRUTH.renderState(resEl, 'empty', 'Aucun résultat confirmé pour cette recherche.', runCompareV2);
    return;
  }
  renderCompareResults(result.data.results, resEl);
}`;

const legacyScan = `function renderScanResult(product, barcode, el) {
  el.innerHTML = \`
    <div class="scanner-result">
      <div style="font-size:11px;color:var(--txt3);margin-bottom:8px">📷 Code : \${barcode}</div>
      <div style="font-size:15px;font-weight:700;margin-bottom:4px">\${product.name}</div>
      <div style="font-size:12px;color:var(--txt3);margin-bottom:12px">\${product.brand || ''} · \${product.stores_count || 1} marchands</div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--accent)">\${product.best_price}€</div>
          <div style="font-size:11px;color:var(--green)">✓ Meilleur prix sur \${product.best_store}</div>
        </div>
        \${product.max_savings > 0 ? \`<div style="background:rgba(0,208,132,.12);border-radius:10px;padding:8px 12px;text-align:center">
          <div style="font-size:13px;font-weight:700;color:var(--green)">-\${product.max_savings}€</div>
          <div style="font-size:10px;color:var(--txt3)">économies max</div>
        </div>\` : ''}
      </div>
      <div class="scanner-btn-row">
        <button class="scanner-btn primary" onclick="loadProductComparison(\${product.product_id}, '\${product.name.replace(/'/g,"\\'")}');openPage('comparePageV2')">⚖️ Comparer les prix</button>
        <button class="scanner-btn secondary" onclick="openPage('analyzePage')">🔬 Analyser</button>
      </div>
    </div>\`;
}`;

const fixture = `<!doctype html><html><body>
${legacyPage}
<script>
${legacyRun}
function renderCompareResults(results, el) { return results && el; }
async function loadProductComparison(productId, productName) {
  return window.JULVOX_API.get('/products/' + encodeURIComponent(productId) + '/compare');
}
function renderProductComparison(data, el) { /* P6_58_COMPARE_MERCHANT_TRUST_TRUTH */ return data && el; }
async function scanBarcode(barcode) {
  await window.JULVOX_API.fetchResponse(API + '/search/compare?q=' + encodeURIComponent(barcode));
  if (typeof window.JULVOX_FORWARD_UNVERIFIED_SCANNER_LOOKUP === 'function') window.JULVOX_FORWARD_UNVERIFIED_SCANNER_LOOKUP(barcode);
}
${legacyScan}
</script>
</body></html>`;

function executableInlineScripts(html) {
  const scripts = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const attrs = match[1] || '';
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const typeMatch = attrs.match(/\btype\s*=\s*["']([^"']+)["']/i);
    const type = (typeMatch ? typeMatch[1] : '').toLowerCase();
    if (type && !['text/javascript', 'application/javascript', 'module'].includes(type)) continue;
    scripts.push(match[2] || '');
  }
  return scripts;
}

test('P6.59 retires reachable legacy best-price comparison claims and is idempotent', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.doesNotMatch(hardened, /JULVOX_API\.get\('\/search\/compare\?q=' \+ encodeURIComponent\(q\)/);
  assert.doesNotMatch(hardened, /\$\{product\.best_price\}€/);
  assert.doesNotMatch(hardened, /Meilleur prix sur \$\{product\.best_store\}/);
  assert.doesNotMatch(hardened, /\$\{product\.max_savings\}€/);
  assert.match(hardened, /P6_59_LEGACY_PRICE_COMPARISON_TRUTH/);
});

test('P6.59 preserves scanner identification bridge and keeps legacy detail comparison dormant', () => {
  const hardened = hardenHtml(fixture);
  assert.match(hardened, /API \+ '\/search\/compare\?q=' \+ encodeURIComponent\(barcode\)/);
  assert.match(hardened, /JULVOX_FORWARD_UNVERIFIED_SCANNER_LOOKUP/);
  assert.match(hardened, /JULVOX_API\.get\('\/products\/' \+ encodeURIComponent\(productId\) \+ '\/compare'/);
  assert.match(hardened, /function renderProductComparison\(data, el\)/);
  assert.match(hardened, /P6_58_COMPARE_MERCHANT_TRUST_TRUTH/);
  assert.match(hardened, /openCanonicalSmartScanFromLegacyCompare\('text'\)/);
  assert.match(hardened, /openCanonicalSmartScanFromLegacyCompare\('barcode'\)/);
  for (const source of executableInlineScripts(hardened)) new vm.Script(source);
});

test('P6.59 is wired after P6.58 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p658Call = csp.indexOf('reconcileCompareMerchantTrustTruth();');
  const p659Call = csp.indexOf('reconcileLegacyPriceComparisonTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p658Call >= 0 && p659Call > p658Call && readCall > p659Call);
});
