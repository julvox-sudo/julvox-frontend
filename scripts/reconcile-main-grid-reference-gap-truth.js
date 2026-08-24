'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_73_MAIN_GRID_REFERENCE_GAP_TRUTH';
const LEGACY_STAT = '<div class="hstat"><div class="hstat-v" id="statDiscount">—</div><div class="hstat-l">Réduction moy.</div></div>';
const SAFE_STAT = '<div class="hstat"><div class="hstat-v" id="statDiscount">—</div><div class="hstat-l">Écart réf. moy.</div></div>';
const LEGACY_SORT = '<button class="sort-btn" onclick="setSort(this,\'discount\')">% Remise</button>';
const SAFE_SORT = '<button class="sort-btn" onclick="setSort(this,\'discount\')">% Écart réf.</button>';
const LEGACY_BADGE = '${pct > 0 ? `<div class="deal-pct${score>=90?\'\':\' gold\'}">−${Math.round(pct)}%</div>` : \'\'}';
const SAFE_BADGE = '${pct > 0 ? `<div class="deal-pct${score>=90?\'\':\' gold\'}" style="background:var(--bg3);color:var(--txt2);border:1px solid var(--border)">Écart réf. ${Math.round(pct)}%</div>` : \'\'}';
const LEGACY_REFERENCE = '${pOld ? `<span class="price-old">${pOld}</span>` : \'\'}';
const SAFE_REFERENCE = '${pOld ? `<span style="font-size:11px;color:var(--txt3)">Réf. source ${pOld}</span>` : \'\'}<!-- P6_73_MAIN_GRID_REFERENCE_GAP_TRUTH -->';

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(MARKER)) {
    assertHardened(html);
    return html;
  }
  for (const [label, legacy] of [
    ['stat', LEGACY_STAT],
    ['sort', LEGACY_SORT],
    ['badge', LEGACY_BADGE],
    ['reference', LEGACY_REFERENCE],
  ]) {
    const count = countOf(html, legacy);
    if (count !== 1) throw new Error(`P6.73 expected one legacy main-grid ${label}, got ${count}`);
  }

  let output = html.replace(LEGACY_STAT, SAFE_STAT);
  output = output.replace(LEGACY_SORT, SAFE_SORT);
  output = output.replace(LEGACY_BADGE, SAFE_BADGE);
  output = output.replace(LEGACY_REFERENCE, SAFE_REFERENCE);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.73 marker count must be 1');
  for (const legacy of [LEGACY_STAT, LEGACY_SORT, LEGACY_BADGE, LEGACY_REFERENCE]) {
    if (html.includes(legacy)) throw new Error('P6.73 legacy main-grid discount framing remains');
  }
  for (const required of [
    SAFE_STAT,
    SAFE_SORT,
    SAFE_BADGE,
    SAFE_REFERENCE,
    "if (currentSort === 'discount') return (b.discount_pct || 0) - (a.discount_pct || 0);",
    'const discounts = deals.map(deal => Number(deal.discount_pct)).filter(Number.isFinite);',
    'const pct    = d.discount_pct || 0;',
    "const pOld   = d.original_price ? formatPrice(d.original_price) : '';",
    'P6_70_BUDGET_CARD_REFERENCE_GAP_TRUTH',
    'P6_71_HOME_INFLUENCE_STATE_TRUTH',
    'P6_72_DEAL_MODAL_REFERENCE_GAP_TRUTH',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.73 required main-grid truth boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_73_MAIN_GRID_REFERENCE_GAP_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
