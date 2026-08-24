'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_83_BUDGET_DETAIL_OPEN_RUNTIME';

const LEGACY_BLOCK = `  el.querySelectorAll('[data-budget-deal-index]').forEach(function(row) {
    row.addEventListener('click', function() {
      const index = Number(row.getAttribute('data-budget-deal-index'));
      const deal = Number.isSafeInteger(index) ? deals[index] : null;
      if (deal) openDeal(deal);
    });
  });`;

const SAFE_BLOCK = `  // ${MARKER}
  el.querySelectorAll('[data-budget-deal-index]').forEach(function(row) {
    row.addEventListener('click', function() {
      const index = Number(row.getAttribute('data-budget-deal-index'));
      const deal = Number.isSafeInteger(index) ? deals[index] : null;
      const id = deal ? trust.positiveId(deal.id) : null;
      if (!deal || !id || !Array.isArray(allDeals)) return;
      const exists = allDeals.some(function(item) {
        return trust.positiveId(item && item.id) === id;
      });
      if (!exists) allDeals.push(deal);
      openDeal(id);
    });
  });`;

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.83 marker count must be 1');
  if (html.includes(LEGACY_BLOCK)) throw new Error('P6.83 legacy Budget detail listener remains');
  for (const required of [
    "data-budget-deal-index",
    "const id = deal ? trust.positiveId(deal.id) : null;",
    "if (!deal || !id || !Array.isArray(allDeals)) return;",
    "return trust.positiveId(item && item.id) === id;",
    "if (!exists) allDeals.push(deal);",
    "openDeal(id);",
    "function openDeal(id) {",
    "window.JulvoxDynamicDealTrust",
    "/budget/optimize",
    "P6_33_BUDGET_DEAL_HTML_TRUST",
    "P6_69_BUDGET_SAVINGS_TRUTH",
    "P6_70_BUDGET_CARD_REFERENCE_GAP_TRUTH",
    "P6_80_BUDGET_SELECTION_COPY_TRUTH",
    "P6_82_SWIPE_HTML_TRUST",
  ]) {
    if (!html.includes(required)) throw new Error(`P6.83 required boundary missing: ${required}`);
  }
  if (html.includes('if (deal) openDeal(deal);')) {
    throw new Error('P6.83 object-to-ID Budget detail mismatch remains');
  }
}

function hardenHtml(html) {
  if (html.includes(`// ${MARKER}`)) {
    assertHardened(html);
    return html;
  }
  const legacyCount = countOf(html, LEGACY_BLOCK);
  if (legacyCount !== 1) throw new Error(`P6.83 expected one legacy Budget listener, got ${legacyCount}`);
  if (countOf(html, 'function openDeal(id) {') !== 1) {
    throw new Error('P6.83 expected one ID-only openDeal authority');
  }
  if (countOf(html, 'P6_33_BUDGET_DEAL_HTML_TRUST') !== 1) {
    throw new Error('P6.83 expected P6.33 Budget HTML trust boundary');
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
  console.log('P6_83_BUDGET_DETAIL_OPEN_RUNTIME_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, LEGACY_BLOCK, SAFE_BLOCK, assertHardened, hardenHtml, hardenPublicArtifact };
