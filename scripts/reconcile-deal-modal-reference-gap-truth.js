'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_72_DEAL_MODAL_REFERENCE_GAP_TRUTH';
const LEGACY_REFERENCE = '${deal.original_price ? `<span class="modal-price-old">${formatPrice(deal.original_price)}</span>` : \'\'}';
const SAFE_REFERENCE = '${deal.original_price ? `<span style="font-size:12px;color:var(--txt3)">Réf. source ${formatPrice(deal.original_price)}</span>` : \'\'}';
const LEGACY_GAP = '${pct > 0 ? `<span class="modal-save">−${Math.round(pct)}% · Économie ${saved}€</span>` : \'\'}';
const SAFE_GAP = '${pct > 0 ? `<span style="font-size:12px;color:var(--txt3)">Écart réf. source ${Math.round(pct)}% · ${saved}€</span>` : \'\'}<!-- P6_72_DEAL_MODAL_REFERENCE_GAP_TRUTH -->';

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(MARKER)) {
    assertHardened(html);
    return html;
  }
  const referenceCount = countOf(html, LEGACY_REFERENCE);
  const gapCount = countOf(html, LEGACY_GAP);
  if (referenceCount !== 1) throw new Error(`P6.72 expected one legacy deal-modal source reference, got ${referenceCount}`);
  if (gapCount !== 1) throw new Error(`P6.72 expected one legacy deal-modal savings display, got ${gapCount}`);

  let output = html.replace(LEGACY_REFERENCE, SAFE_REFERENCE);
  output = output.replace(LEGACY_GAP, SAFE_GAP);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.72 marker count must be 1');
  if (html.includes(LEGACY_REFERENCE)) throw new Error('P6.72 legacy struck-through source reference remains in deal modal');
  if (html.includes(LEGACY_GAP)) throw new Error('P6.72 legacy factual savings framing remains in deal modal');
  for (const required of [
    SAFE_REFERENCE,
    SAFE_GAP,
    'const pct   = deal.discount_pct || 0;',
    'const saved = deal.original_price ? (deal.original_price - deal.current_price).toFixed(2) : 0;',
    'function openDeal(id)',
    'P6_69_BUDGET_SAVINGS_TRUTH',
    'P6_70_BUDGET_CARD_REFERENCE_GAP_TRUTH',
    'P6_71_HOME_INFLUENCE_STATE_TRUTH',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.72 required deal-modal truth boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_72_DEAL_MODAL_REFERENCE_GAP_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
