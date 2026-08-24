'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_79_SWIPE_REFERENCE_GAP_TRUTH';
const LEGACY_DISCOUNT = "const discount = deal.discount_pct ? `-${Math.round(deal.discount_pct)}%` : '';";
const SAFE_DISCOUNT = "const discount = deal.discount_pct ? `Écart réf. ${Math.round(deal.discount_pct)}%` : '';";
const LEGACY_BADGE = '${discount ? `<span style="background:rgba(255,92,43,.15);color:var(--accent);font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px">${discount}</span>` : \'\'}';
const SAFE_BADGE = '${discount ? `<span style="background:var(--bg3);color:var(--txt2);border:1px solid var(--border);font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px">${discount}</span>` : \'\'}';
const LEGACY_REFERENCE = '${deal.original_price ? `<div style="font-size:14px;color:var(--txt3);text-decoration:line-through;margin-bottom:3px">${deal.original_price}€</div>` : \'\'}';
const SAFE_REFERENCE = '${deal.original_price ? `<div style="font-size:11px;color:var(--txt3);margin-bottom:3px">Réf. source ${deal.original_price}€</div>` : \'\'}<!-- P6_79_SWIPE_REFERENCE_GAP_TRUTH -->';

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(MARKER)) {
    assertHardened(html);
    return html;
  }
  for (const [label, legacy] of [
    ['discount', LEGACY_DISCOUNT],
    ['badge', LEGACY_BADGE],
    ['reference', LEGACY_REFERENCE],
  ]) {
    const count = countOf(html, legacy);
    if (count !== 1) throw new Error(`P6.79 expected one legacy Swipe ${label}, got ${count}`);
  }

  let output = html.replace(LEGACY_DISCOUNT, SAFE_DISCOUNT);
  output = output.replace(LEGACY_BADGE, SAFE_BADGE);
  output = output.replace(LEGACY_REFERENCE, SAFE_REFERENCE);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.79 marker count must be 1');
  for (const legacy of [LEGACY_DISCOUNT, LEGACY_BADGE, LEGACY_REFERENCE]) {
    if (html.includes(legacy)) throw new Error('P6.79 legacy Swipe discount framing remains');
  }
  for (const required of [
    SAFE_DISCOUNT,
    SAFE_BADGE,
    SAFE_REFERENCE,
    "if (openTarget === 'swipe')    openSwipePage();",
    '/deals/feed/swipe?limit=20',
    'function buildSwipeCard(deal, isTop) {',
    'const score    = ui00ResolveScore(deal.novadeal_score);',
    'P6_78_COMMUNITY_REFERENCE_GAP_TRUTH',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.79 required Swipe truth boundary missing: ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_79_SWIPE_REFERENCE_GAP_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
