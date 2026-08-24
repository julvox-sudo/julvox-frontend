'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_69_BUDGET_SAVINGS_TRUTH';
const LEGACY_LABEL = '<div style="font-size:12px;color:rgba(255,255,255,.6)">ÉCONOMIES</div>';
const LEGACY_VALUE = '<div class="budget-saved">+${totalSaved.toFixed(2)}€</div>';
const LEGACY_EFFICIENCY = '<div class="budget-efficiency">⚡ Efficacité : ${Math.round(efficiency)}% — ${deals.length} deals</div>';
const SAFE_LABEL = '<div style="font-size:12px;color:rgba(255,255,255,.6)">ÉCART VS RÉFÉRENCES SOURCE</div>';
const SAFE_VALUE = '<div style="font-family:\'Syne\',sans-serif;font-size:22px;font-weight:800">${totalSaved.toFixed(2)}€</div>';
const SAFE_SELECTION = '<div style="font-size:13px;font-weight:600;margin-top:8px">Sélection : ${deals.length} offres</div>';
const SAFE_NOTE = '<div style="font-size:11px;color:rgba(255,255,255,.5);margin-top:6px">Écart calculé à partir des prix de référence fournis par les sources — il ne représente pas une économie réalisée.</div>';

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(MARKER)) {
    assertHardened(html);
    return html;
  }

  for (const [label, needle] of [
    ['legacy aggregate savings label', LEGACY_LABEL],
    ['legacy aggregate plus-value', LEGACY_VALUE],
    ['legacy efficiency framing', LEGACY_EFFICIENCY],
  ]) {
    const count = countOf(html, needle);
    if (count !== 1) throw new Error(`P6.69 expected one ${label}, got ${count}`);
  }

  let output = html
    .replace(LEGACY_LABEL, SAFE_LABEL)
    .replace(LEGACY_VALUE, SAFE_VALUE)
    .replace(
      LEGACY_EFFICIENCY,
      `${SAFE_SELECTION}\n      ${SAFE_NOTE}\n      <!-- ${MARKER} -->`,
    );

  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.69 marker count must be 1');
  for (const legacy of [LEGACY_LABEL, LEGACY_VALUE, LEGACY_EFFICIENCY]) {
    if (html.includes(legacy)) throw new Error(`P6.69 legacy budget savings framing remains: ${legacy}`);
  }
  for (const required of [
    SAFE_LABEL,
    SAFE_VALUE,
    SAFE_SELECTION,
    SAFE_NOTE,
    "API + '/budget/optimize'",
    'payload.total_saved',
    'payload.efficiency',
    'P6_68_ALERT_TARGET_SELECTION_TRUTH',
    'P6_67_PROMO_STATS_TRUTH',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.69 required budget truth boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_69_BUDGET_SAVINGS_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
