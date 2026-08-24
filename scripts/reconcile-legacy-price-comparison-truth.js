'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_59_LEGACY_PRICE_COMPARISON_TRUTH';

const LEGACY_PAGE = `<!-- ══════════════════════════════════════════════════════════
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

const SAFE_PAGE = `<!-- ══════════════════════════════════════════════════════════
     COMPARATEUR — PONT SMART SCAN
══════════════════════════════════════════════════════════ -->
<div class="page" id="comparePageV2">
  <div class="page-head">
    <button class="page-back" onclick="closePage('comparePageV2')">← Retour</button>
    <div class="page-title">🔍 Comparer avec Smart Scan</div>
  </div>
  <div class="page-body">
    <div class="analyze-wrap"><!-- ${MARKER} -->
      <div style="font-size:14px;line-height:1.55;color:var(--txt2)">Le comparateur historique ne garantit pas que les offres sont réellement comparables (devise, marché, état et provenance). Smart Scan vérifie les faits disponibles avant toute comparaison ou recommandation.</div>
      <button class="analyze-btn" style="margin-top:12px" onclick="openCanonicalSmartScanFromLegacyCompare('text')">Ouvrir Smart Scan</button>
    </div>
    <div id="compareV2Results"></div>
  </div>
</div>`;

const LEGACY_RUN = `async function runCompareV2() {
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

const SAFE_RUN = `function openCanonicalSmartScanFromLegacyCompare(mode = 'text') {
  const resEl = document.getElementById('compareV2Results');
  const smartScan = window.JulvoxSmartScan;
  if (smartScan && typeof smartScan.open === 'function') {
    if (resEl) resEl.textContent = 'Smart Scan ouvert : les offres seront comparées uniquement à partir des faits disponibles.';
    smartScan.open(mode);
    return true;
  }
  if (resEl) resEl.textContent = 'Smart Scan est indisponible sur cet environnement. Aucun meilleur prix ni économie n’est inventé.';
  return false;
}

async function runCompareV2() {
  return openCanonicalSmartScanFromLegacyCompare('text');
}`;

const LEGACY_SCAN_RESULT = `function renderScanResult(product, barcode, el) {
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

const SAFE_SCAN_RESULT = `function renderScanResult(product, barcode, el) {
  el.innerHTML = \`
    <div class="scanner-result">
      <div style="font-size:11px;color:var(--txt3);margin-bottom:8px">📷 Code : \${barcode}</div>
      <div style="font-size:15px;font-weight:700;margin-bottom:4px">\${product.name}</div>
      <div style="font-size:12px;color:var(--txt3);margin-bottom:12px">\${product.brand || ''}</div>
      <div style="font-size:12px;line-height:1.5;color:var(--txt2);margin-bottom:14px">Identification provisoire : les prix, écarts et marchands comparables doivent être confirmés par Smart Scan.</div>
      <div class="scanner-btn-row">
        <button class="scanner-btn primary" onclick="openCanonicalSmartScanFromLegacyCompare('barcode')">Continuer dans Smart Scan</button>
      </div>
    </div>\`;
}`;

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(`<!-- ${MARKER} -->`)) {
    assertHardened(html);
    return html;
  }
  for (const [name, block] of [['page', LEGACY_PAGE], ['run', LEGACY_RUN], ['scan', LEGACY_SCAN_RESULT]]) {
    const count = countOf(html, block);
    if (count !== 1) throw new Error(`P6.59 expected exactly one legacy ${name} block, got ${count}`);
  }
  const output = html
    .replace(LEGACY_PAGE, SAFE_PAGE)
    .replace(LEGACY_RUN, SAFE_RUN)
    .replace(LEGACY_SCAN_RESULT, SAFE_SCAN_RESULT);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.59 marker count must be 1');
  const unsupported = [
    "window.JULVOX_API.get('/search/compare?q=' + encodeURIComponent(q)",
    '${product.best_price}€',
    '✓ Meilleur prix sur ${product.best_store}',
    '${product.max_savings}€',
    'onclick="loadProductComparison(${product.product_id}',
  ];
  for (const value of unsupported) if (html.includes(value)) throw new Error(`P6.59 unsupported active comparison surface remains: ${value}`);
  const required = [
    "openCanonicalSmartScanFromLegacyCompare('text')",
    "openCanonicalSmartScanFromLegacyCompare('barcode')",
    'Aucun meilleur prix ni économie n’est inventé.',
    "API + '/search/compare?q=' + encodeURIComponent(barcode)",
    'window.JULVOX_FORWARD_UNVERIFIED_SCANNER_LOOKUP',
    "window.JULVOX_API.get('/products/' + encodeURIComponent(productId) + '/compare'",
    'function renderProductComparison(data, el)',
    'P6_58_COMPARE_MERCHANT_TRUST_TRUTH',
  ];
  for (const value of required) if (!html.includes(value)) throw new Error(`P6.59 required compatibility/canonical boundary missing: ${value}`);
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_59_LEGACY_PRICE_COMPARISON_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
