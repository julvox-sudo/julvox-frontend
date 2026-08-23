'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_51_LEGACY_DEAL_ANALYSIS_TRUTH';

const LEGACY_FUNCTION = `async function runDealAnalysis() {
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
}`;

const SAFE_FUNCTION = `function openCanonicalSmartScanFromLegacyAnalyze() {
  const resultsEl = document.getElementById('analyzeResults');
  const smartScan = window.JulvoxSmartScan;
  if (smartScan && typeof smartScan.open === 'function') {
    if (resultsEl) resultsEl.textContent = 'Smart Scan ouvert : Julvox évaluera uniquement les faits disponibles.';
    smartScan.open('text');
    return;
  }
  if (resultsEl) resultsEl.textContent = 'Smart Scan est indisponible sur cet environnement. Aucune recommandation n’est inventée.';
}

async function runDealAnalysis() {
  return openCanonicalSmartScanFromLegacyAnalyze();
}`;

const PANEL_PATTERN = /(<div class="page" id="analyzePage">[\s\S]*?<div class="page-body">\s*)<div class="analyze-wrap">[\s\S]*?<div id="analyzeResults"><\/div>/;
const SAFE_PANEL = `$1<!-- ${MARKER} -->
    <div class="analyze-wrap">
      <p style="font-size:13px;color:var(--txt2);margin-bottom:14px;line-height:1.5">
        Cette ancienne analyse rapide ne dispose pas d’un historique de prix vérifié. Pour une décision Julvox, utilisez Smart Scan : il s’appuie sur les faits disponibles et peut conclure que les informations sont insuffisantes.
      </p>
      <button class="analyze-btn" onclick="openCanonicalSmartScanFromLegacyAnalyze()">🔎 Ouvrir Smart Scan</button>
    </div>
    <div id="analyzeResults" aria-live="polite"></div>`;

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(`<!-- ${MARKER} -->`)) {
    assertHardened(html);
    return html;
  }

  const functionCount = countOf(html, LEGACY_FUNCTION);
  if (functionCount !== 1) throw new Error(`P6.51 expected one legacy runDealAnalysis function, got ${functionCount}`);
  if (!PANEL_PATTERN.test(html)) throw new Error('P6.51 could not locate the legacy analyze panel');

  let output = html.replace(LEGACY_FUNCTION, SAFE_FUNCTION);
  output = output.replace(PANEL_PATTERN, SAFE_PANEL);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const markerCount = countOf(html, MARKER);
  if (markerCount !== 1) throw new Error(`P6.51 marker count must be 1, got ${markerCount}`);

  if (html.includes("JULVOX_API.post('/deals/analyze'")) throw new Error('P6.51 legacy /deals/analyze call remains reachable in public artifact');
  if (html.includes('price_history: []')) throw new Error('P6.51 empty-history analysis payload remains in public artifact');
  if (html.includes("Entrez le prix actuel et le prix original d'un produit — Julvox analyse l'historique et vous dit si c'est une vraie bonne affaire.")) {
    throw new Error('P6.51 unsupported legacy analyze claim remains');
  }

  for (const legacyId of ['analyzeCurrentPrice', 'analyzeOriginalPrice', 'analyzeStore', 'analyzeCategory']) {
    if (html.includes(`id="${legacyId}"`)) throw new Error(`P6.51 legacy analyze input remains: ${legacyId}`);
  }

  for (const required of [
    'Cette ancienne analyse rapide ne dispose pas d’un historique de prix vérifié.',
    'peut conclure que les informations sont insuffisantes',
    'openCanonicalSmartScanFromLegacyAnalyze()',
    "smartScan.open('text')",
    'Aucune recommandation n’est inventée.',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.51 required fail-closed boundary missing: ${required}`);
  }

  if (countOf(html, 'function renderAnalysisResults(') !== 1) throw new Error('P6.51 expected dormant legacy renderer to remain exactly once');
  if (countOf(html, 'renderAnalysisResults(') !== 1) throw new Error('P6.51 legacy renderer must have no active caller');
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_51_LEGACY_DEAL_ANALYSIS_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
