'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_84_WISHLIST_DETAIL_OPEN_RUNTIME';

const LEGACY_BLOCK = `async function openDealById(dealId) {
  try {
    const res  = await window.JULVOX_API.fetchResponse(API + '/deals/' + dealId);
    const data = await res.json();
    if (data.id) openDeal(data);
  } catch(e) {}
}`;

const SAFE_BLOCK = `// ${MARKER}
async function openDealById(dealId) {
  const trust = window.JulvoxDynamicDealTrust;
  const requestedId = trust && typeof trust.positiveId === 'function'
    ? trust.positiveId(dealId)
    : null;
  if (!requestedId || !trust || typeof trust.normalizeDeal !== 'function') return;
  try {
    const res  = await window.JULVOX_API.fetchResponse(API + '/deals/' + requestedId);
    const data = await res.json();
    const deal = trust.normalizeDeal(data, true);
    const resolvedId = deal ? trust.positiveId(deal.id) : null;
    if (!deal || !resolvedId || resolvedId !== requestedId || !Array.isArray(allDeals)) return;
    const existingIndex = allDeals.findIndex(function(item) {
      return trust.positiveId(item && item.id) === resolvedId;
    });
    if (existingIndex >= 0) allDeals[existingIndex] = deal;
    else allDeals.push(deal);
    openDeal(resolvedId);
  } catch(e) {}
}`;

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.84 marker count must be 1');
  if (html.includes(LEGACY_BLOCK)) throw new Error('P6.84 legacy Wishlist detail opener remains');
  if (html.includes('if (data.id) openDeal(data);')) {
    throw new Error('P6.84 object-to-ID Wishlist detail mismatch remains');
  }
  for (const required of [
    'data-wishlist-open-deal',
    "const requestedId = trust && typeof trust.positiveId === 'function'",
    "const deal = trust.normalizeDeal(data, true);",
    "const resolvedId = deal ? trust.positiveId(deal.id) : null;",
    "resolvedId !== requestedId",
    "allDeals.findIndex(function(item)",
    "if (existingIndex >= 0) allDeals[existingIndex] = deal;",
    "else allDeals.push(deal);",
    "openDeal(resolvedId);",
    "function openDeal(id) {",
    "window.JulvoxDynamicDealTrust",
    "P6_34_WISHLIST_HTML_TRUST",
    "P6_41_FAVORITES_LOCAL_TRUTH",
    "P6_83_BUDGET_DETAIL_OPEN_RUNTIME",
  ]) {
    if (!html.includes(required)) throw new Error(`P6.84 required boundary missing: ${required}`);
  }
}

function hardenHtml(html) {
  if (html.includes(`// ${MARKER}`)) {
    assertHardened(html);
    return html;
  }
  const legacyCount = countOf(html, LEGACY_BLOCK);
  if (legacyCount !== 1) throw new Error(`P6.84 expected one legacy Wishlist opener, got ${legacyCount}`);
  if (countOf(html, 'function openDeal(id) {') !== 1) {
    throw new Error('P6.84 expected one ID-only openDeal authority');
  }
  if (countOf(html, 'P6_34_WISHLIST_HTML_TRUST') !== 1) {
    throw new Error('P6.84 expected P6.34 Wishlist HTML trust boundary');
  }
  const output = html.replace(LEGACY_BLOCK, SAFE_BLOCK);
  assertHardened(output);
  return output;
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_84_WISHLIST_DETAIL_OPEN_RUNTIME_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, LEGACY_BLOCK, SAFE_BLOCK, assertHardened, hardenHtml, hardenPublicArtifact };
