'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_75_DEAL_OF_DAY_REFERENCE_GAP_TRUTH';
const LEGACY_REFERENCE = '${deal.original_price ? `<div style="font-size:16px;text-decoration:line-through;color:rgba(255,255,255,.4);margin-bottom:4px">${deal.original_price}€</div>` : \'\'}';
const SAFE_REFERENCE = '${deal.original_price ? `<div style="font-size:12px;color:rgba(255,255,255,.55);margin-bottom:4px">Réf. source ${deal.original_price}€</div>` : \'\'}';
const LEGACY_BADGE = '${discount ? `<div style="background:var(--accent);color:#fff;font-size:13px;font-weight:700;padding:3px 10px;border-radius:8px;margin-bottom:2px">-${discount}%</div>` : \'\'}';
const SAFE_BADGE = '${discount ? `<div style="background:rgba(255,255,255,.08);color:rgba(255,255,255,.72);border:1px solid rgba(255,255,255,.14);font-size:12px;font-weight:600;padding:3px 10px;border-radius:8px;margin-bottom:2px">Écart réf. ${discount}%</div>` : \'\'}<!-- P6_75_DEAL_OF_DAY_REFERENCE_GAP_TRUTH -->';

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(MARKER)) {
    assertHardened(html);
    return html;
  }
  for (const [label, legacy] of [['reference', LEGACY_REFERENCE], ['badge', LEGACY_BADGE]]) {
    const count = countOf(html, legacy);
    if (count !== 1) throw new Error(`P6.75 expected one legacy deal-of-day ${label}, got ${count}`);
  }
  let output = html.replace(LEGACY_REFERENCE, SAFE_REFERENCE);
  output = output.replace(LEGACY_BADGE, SAFE_BADGE);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.75 marker count must be 1');
  if (html.includes(LEGACY_REFERENCE)) throw new Error('P6.75 legacy struck-through deal-of-day reference remains');
  if (html.includes(LEGACY_BADGE)) throw new Error('P6.75 legacy deal-of-day discount badge remains');
  for (const required of [
    SAFE_REFERENCE,
    SAFE_BADGE,
    'function renderDealOfDay(deal, el) {',
    'const discount = deal.discount_pct ? Math.round(deal.discount_pct) : 0;',
    'window._currentDealOfDay = deal;',
    'P6_74_DEAL_OF_DAY_SHARE_HANDLER_TRUTH',
    '(écart réf. source ${sourceGap}%)',
    'P6_73_MAIN_GRID_REFERENCE_GAP_TRUTH',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.75 required deal-of-day truth boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_75_DEAL_OF_DAY_REFERENCE_GAP_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
