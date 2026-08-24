'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_70_BUDGET_CARD_REFERENCE_GAP_TRUTH';
const LEGACY_DISPLAY = '${discount > 0 ? `<div style="font-size:11px;color:var(--green)">-${Math.round(Math.min(100, discount))}%</div>` : \'\'}';
const SAFE_DISPLAY = '${discount > 0 ? `<div style="font-size:11px;color:var(--txt3)">Écart réf. source ${Math.round(Math.min(100, discount))}%</div>` : \'\'}<!-- P6_70_BUDGET_CARD_REFERENCE_GAP_TRUTH -->';

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(MARKER)) {
    assertHardened(html);
    return html;
  }
  const count = countOf(html, LEGACY_DISPLAY);
  if (count !== 1) throw new Error(`P6.70 expected one legacy budget-card discount display, got ${count}`);
  const output = html.replace(LEGACY_DISPLAY, SAFE_DISPLAY);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.70 marker count must be 1');
  if (html.includes(LEGACY_DISPLAY)) throw new Error('P6.70 legacy budget-card discount framing remains');
  for (const required of [
    SAFE_DISPLAY,
    'const discount = finite(deal.discount_pct, 0);',
    "API + '/budget/optimize'",
    'P6_69_BUDGET_SAVINGS_TRUTH',
    'P6_68_ALERT_TARGET_SELECTION_TRUTH',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.70 required budget-card truth boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_70_BUDGET_CARD_REFERENCE_GAP_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
