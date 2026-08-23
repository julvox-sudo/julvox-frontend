'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { hardenHtml } = require('../../scripts/reconcile-legacy-deal-analysis-truth');

const fixture = `<!doctype html><html><body>
<div class="page" id="analyzePage">
  <div class="page-head"><div class="page-title">⚡ Deal ou pas Deal ?</div></div>
  <div class="page-body">
    <div class="analyze-wrap">
      <p>Entrez le prix actuel et le prix original d'un produit — Julvox analyse l'historique et vous dit si c'est une vraie bonne affaire.</p>
      <input id="analyzeCurrentPrice"/><input id="analyzeOriginalPrice"/>
      <select id="analyzeStore"></select><select id="analyzeCategory"></select>
      <button onclick="runDealAnalysis()">🔬 Analyser ce deal</button>
    </div>
    <div id="analyzeResults"></div>
  </div>
</div>
<script>
async function runDealAnalysis() {
  const currentPrice = Number.parseFloat(document.getElementById('analyzeCurrentPrice')?.value);
  const originalPrice = Number.parseFloat(document.getElementById('analyzeOriginalPrice')?.value) || null;
  const store = document.getElementById('analyzeStore')?.value || '';
  const category = document.getElementById('analyzeCategory')?.value || '';
  const resultsEl = document.getElementById('analyzeResults');
  if (!currentPrice || currentPrice <= 0) { showToast('⚠️ Entre un prix valide'); return; }
  resultsEl.textContent = 'Analyse en cours…';
  const result = await window.JULVOX_API.post('/deals/analyze', {
    current_price: currentPrice, claimed_original: originalPrice, price_history: [], store, category,
  }, { confirm: data => Number.isFinite(data?.score) });
  if (!result.ok) { window.JULVOX_PRODUCTION_TRUTH.renderState(resultsEl, 'error', result.message || 'Analyse indisponible.', runDealAnalysis); return; }
  renderAnalysisResults(result.data, resultsEl, currentPrice, originalPrice);
}
function renderAnalysisResults(data, el, currentPrice, originalPrice) { el.textContent = data.verdict || ''; }
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

test('P6.51 removes the reachable empty-history legacy analysis path', () => {
  const hardened = hardenHtml(fixture);
  assert.equal(hardenHtml(hardened), hardened);
  assert.doesNotMatch(hardened, /JULVOX_API\.post\('\/deals\/analyze'/);
  assert.doesNotMatch(hardened, /price_history:\s*\[\]/);
  assert.doesNotMatch(hardened, /vraie bonne affaire/);
  assert.doesNotMatch(hardened, /id="analyzeCurrentPrice"/);
  assert.doesNotMatch(hardened, /id="analyzeOriginalPrice"/);
  assert.doesNotMatch(hardened, /id="analyzeStore"/);
  assert.doesNotMatch(hardened, /id="analyzeCategory"/);
});

test('P6.51 fails closed into canonical Smart Scan without a frontend verdict', () => {
  const hardened = hardenHtml(fixture);
  assert.match(hardened, /historique de prix vérifié/);
  assert.match(hardened, /informations sont insuffisantes/);
  assert.match(hardened, /openCanonicalSmartScanFromLegacyAnalyze\(\)/);
  assert.match(hardened, /smartScan\.open\('text'\)/);
  assert.match(hardened, /Aucune recommandation n’est inventée/);
  assert.equal((hardened.match(/renderAnalysisResults\(/g) || []).length, 1, 'legacy renderer remains dormant with no caller');
  for (const source of executableInlineScripts(hardened)) new vm.Script(source);
});

test('P6.51 is wired after P6.50 and before CSP hashing', () => {
  const csp = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'harden-inline-element-csp.js'), 'utf8');
  const p650Call = csp.indexOf('reconcileDealVerificationCopyTruth();');
  const p651Call = csp.indexOf('reconcileLegacyDealAnalysisTruth();');
  const readCall = csp.indexOf("fs.readFileSync(indexPath, 'utf8')");
  assert.ok(p650Call >= 0 && p651Call > p650Call && readCall > p651Call);
});
