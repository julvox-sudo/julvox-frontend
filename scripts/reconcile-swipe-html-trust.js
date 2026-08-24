'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_82_SWIPE_HTML_TRUST';
const LEGACY_ASSIGNMENT = '  swipeDeals = result.data.deals;';
const CARD_START = 'function buildSwipeCard(deal, isTop) {';
const CARD_END = '// P6_81_SWIPE_RUNTIME_ACTIONS';
const EXPECTED_CARD_SHA256 = '873cc6e5ef20ced512bc409da3f17b0960447d8c5a34b978d304a48960e77722';

const SAFE_ASSIGNMENT = `  const swipeTrust = window.JulvoxDynamicDealTrust;
  if (!swipeTrust || typeof swipeTrust.normalizeDeal !== 'function') {
    window.JULVOX_PRODUCTION_TRUTH.renderState(stack, 'error', 'Offres indisponibles.', loadSwipeFeed);
    return;
  }
  swipeDeals = (Array.isArray(result.data.deals) ? result.data.deals : [])
    .map(function(deal) { return swipeTrust.normalizeDeal(deal, true); })
    .filter(Boolean);
  if (!swipeDeals.length) {
    window.JULVOX_PRODUCTION_TRUTH.renderState(stack, 'empty', 'Aucune offre disponible.', loadSwipeFeed);
    return;
  }
  // ${MARKER}`;

function countOf(source, needle) {
  return source.split(needle).length - 1;
}

function sha256(source) {
  return crypto.createHash('sha256').update(source, 'utf8').digest('hex');
}

function hardenCardBlock(cardBlock) {
  let output = cardBlock;
  const opening = CARD_START + '\n';
  if (!output.startsWith(opening)) throw new Error('P6.82 Swipe card opening drifted');

  output = output.replace(opening, `${opening}  const trust = window.JulvoxDynamicDealTrust;
  const safeDeal = trust && typeof trust.normalizeDeal === 'function' ? trust.normalizeDeal(deal, true) : null;
  if (!safeDeal || !trust || typeof trust.html !== 'function') {
    const unavailable = document.createElement('div');
    unavailable.className = 'swipe-card';
    unavailable.textContent = 'Offre indisponible';
    return unavailable;
  }
  const safeName = trust.html(safeDeal.name);
  const safeStore = trust.html(safeDeal.store || '');
  const safeImage = trust.html(safeDeal.image_url || '');
  const safeEmoji = trust.html(getCatEmoji(safeDeal.category));
`);

  output = output
    .replace(/deal\.novadeal_score/g, 'safeDeal.novadeal_score')
    .replace(/deal\.discount_pct/g, 'safeDeal.discount_pct')
    .replace(/deal\.image_url/g, 'safeDeal.image_url')
    .replace(/deal\.category/g, 'safeDeal.category')
    .replace(/deal\.is_fake/g, 'safeDeal.is_fake')
    .replace(/deal\.current_price/g, 'safeDeal.current_price')
    .replace(/deal\.original_price/g, 'safeDeal.original_price')
    .replace(/\$\{safeDeal\.image_url\}/g, '${safeImage}')
    .replace(/\$\{deal\.name\}/g, '${safeName}')
    .replace(/\$\{deal\.store \|\| ''\}/g, '${safeStore}')
    .replace(/getCatEmoji\(safeDeal\.category\)/g, 'safeEmoji');

  return output;
}

function hardenHtml(html) {
  if (html.includes(MARKER)) {
    assertHardened(html);
    return html;
  }

  if (countOf(html, LEGACY_ASSIGNMENT) !== 1) {
    throw new Error(`P6.82 expected one raw Swipe feed assignment, got ${countOf(html, LEGACY_ASSIGNMENT)}`);
  }
  if (countOf(html, CARD_START) !== 1 || countOf(html, CARD_END) !== 1) {
    throw new Error('P6.82 expected one Swipe card block and one P6.81 boundary');
  }

  const start = html.indexOf(CARD_START);
  const end = html.indexOf(CARD_END, start);
  const cardBlock = html.slice(start, end);
  const observedHash = sha256(cardBlock);
  if (observedHash !== EXPECTED_CARD_SHA256) {
    throw new Error(`P6.82 Swipe card block hash drifted: ${observedHash}`);
  }

  let output = html.replace(LEGACY_ASSIGNMENT, SAFE_ASSIGNMENT);
  output = output.slice(0, start) + hardenCardBlock(cardBlock) + output.slice(end + (output.length - html.length));
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  if (countOf(html, MARKER) !== 1) throw new Error('P6.82 marker count must be 1');
  if (html.includes(LEGACY_ASSIGNMENT)) throw new Error('P6.82 raw Swipe feed assignment remains');

  for (const required of [
    "swipeTrust.normalizeDeal(deal, true)",
    "const safeDeal = trust && typeof trust.normalizeDeal === 'function' ? trust.normalizeDeal(deal, true) : null;",
    "const safeName = trust.html(safeDeal.name);",
    "const safeStore = trust.html(safeDeal.store || '');",
    "const safeImage = trust.html(safeDeal.image_url || '');",
    "const safeEmoji = trust.html(getCatEmoji(safeDeal.category));",
    '${safeImage}',
    '${safeName}',
    '${safeStore}',
    '/deals/feed/swipe?limit=20',
    'P6_28_DYNAMIC_DEAL_HTML_TRUST',
    'P6_79_SWIPE_REFERENCE_GAP_TRUTH',
    'P6_81_SWIPE_RUNTIME_ACTIONS',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.82 required boundary missing: ${required}`);
  }

  for (const forbidden of [
    'src="${deal.image_url}"',
    'alt="${deal.name}"',
    '<div class="swipe-name">${deal.name}</div>',
    "${deal.store || ''}",
  ]) {
    if (html.includes(forbidden)) throw new Error(`P6.82 unsafe Swipe sink remains: ${forbidden}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_82_SWIPE_HTML_TRUST_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = {
  MARKER,
  EXPECTED_CARD_SHA256,
  assertHardened,
  hardenCardBlock,
  hardenHtml,
  hardenPublicArtifact,
  sha256,
};
