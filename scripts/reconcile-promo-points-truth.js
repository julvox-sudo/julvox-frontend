'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_60_PROMO_POINTS_TRUTH';
const LEGACY = 'showToast(`🏷️ Code "${code}" ajouté ! +10 pts`);';
const SAFE = 'showToast(`🏷️ Code "${code}" ajouté !`); /* P6_60_PROMO_POINTS_TRUTH */';

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function hardenHtml(html) {
  if (html.includes(MARKER)) {
    assertHardened(html);
    return html;
  }
  const count = countOf(html, LEGACY);
  if (count !== 1) throw new Error(`P6.60 expected exactly one promo points toast, got ${count}`);
  const output = html.replace(LEGACY, SAFE);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.60 marker count must be 1');
  if (html.includes(LEGACY)) throw new Error('P6.60 fabricated promo points reward remains');
  const required = [
    'showToast(`🏷️ Code "${code}" ajouté !`);',
    'async function submitPromoCode()',
    "window.JULVOX_API.fetchResponse(`${API}/promos`,",
    "method: 'POST'",
    'await loadAndRenderPromos();',
    'P6_59_LEGACY_PRICE_COMPARISON_TRUTH',
  ];
  for (const value of required) if (!html.includes(value)) throw new Error(`P6.60 required promo/P6.59 boundary missing: ${value}`);
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_60_PROMO_POINTS_TRUTH_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
