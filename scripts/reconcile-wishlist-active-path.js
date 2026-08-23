'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = 'P6_36_WISHLIST_ACTIVE_PATH_RECONCILIATION';
const LEGACY_START = 'async function loadWishlist() {';
const LEGACY_END = '// ── MODE BUDGET ───────────────────────────────────────────────';
const OLD_NAV = `<button class="sort-btn" onclick="openPage('wishlistPage');typeof loadWishlist==='function'&&loadWishlist()">❤️ Wishlist</button>`;
const NEW_NAV = `<button class="sort-btn" onclick="openWishlist()">❤️ Wishlist</button>`;

const RECONCILED_LEGACY = `// ${MARKER}\nasync function loadWishlist() {\n  return loadWishlistItems();\n}\n\nfunction renderWishlist(items, el) {\n  return renderWishlistItems(items, el);\n}\n\n`;

function replaceOnce(html, from, to, label) {
  const count = html.split(from).length - 1;
  if (count !== 1) throw new Error(`P6.36 expected exactly one ${label}, got ${count}`);
  return html.replace(from, to);
}

function hardenHtml(html) {
  if (html.includes(`// ${MARKER}`)) {
    assertHardened(html);
    return html;
  }

  let output = replaceOnce(html, OLD_NAV, NEW_NAV, 'legacy wishlist nav');
  output = replaceOnce(output, 'id="wishProductName"', 'id="wishName"', 'wishlist product input id');
  output = replaceOnce(output, 'id="wishlistContent"', 'id="wishlistItems"', 'wishlist visible container id');

  const start = output.indexOf(LEGACY_START);
  const end = output.indexOf(LEGACY_END, start + LEGACY_START.length);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('P6.36 legacy wishlist renderer block anchors missing');
  }
  const legacy = output.slice(start, end);
  for (const expected of [
    'data?.wishlist',
    'result.data.wishlist',
    '${item.product_name}',
    "onclick=\"openDeal({id:${item.best_deal_id},name:'${item.product_name}'",
    'onclick="removeFromWishlist(${item.id})"',
  ]) {
    if (!legacy.includes(expected)) throw new Error(`P6.36 expected legacy wishlist sink missing: ${expected}`);
  }

  output = output.slice(0, start) + RECONCILED_LEGACY + output.slice(end);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const markerCount = (html.match(new RegExp(MARKER, 'g')) || []).length;
  if (markerCount !== 1) throw new Error(`P6.36 marker count must be 1, got ${markerCount}`);
  for (const bad of [
    'id="wishProductName"',
    'id="wishlistContent"',
    "typeof loadWishlist==='function'&&loadWishlist()",
    'data?.wishlist',
    'result.data.wishlist',
    '${item.product_name}',
    "onclick=\"openDeal({id:${item.best_deal_id}",
  ]) {
    if (html.includes(bad)) throw new Error(`P6.36 stale wishlist path remains: ${bad}`);
  }
  for (const required of [
    'id="wishName"',
    'id="wishlistItems"',
    'onclick="openWishlist()"',
    'return loadWishlistItems();',
    'return renderWishlistItems(items, el);',
    'data?.items',
    'result.data.items',
    'data-wishlist-remove',
  ]) {
    if (!html.includes(required)) throw new Error(`P6.36 missing ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_36_WISHLIST_ACTIVE_PATH_RECONCILIATION_PASS');
}

if (require.main === module) hardenPublicArtifact();
module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
