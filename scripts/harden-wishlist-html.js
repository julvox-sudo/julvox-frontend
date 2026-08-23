'use strict';

const fs = require('node:fs');
const path = require('node:path');

const START = 'function renderWishlistItems(items, el) {';
const END = 'async function openDealById(dealId) {';
const MARKER = 'P6_34_WISHLIST_HTML_TRUST';

const HARDENED = `// ${MARKER}
function renderWishlistItems(items, el) {
  const trust = window.JulvoxDynamicDealTrust;
  if (!el || !trust) return;
  const finitePositive = function(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  };
  const normalized = (Array.isArray(items) ? items : []).map(function(item) {
    const id = trust.positiveId(item && item.id);
    if (!id) return null;
    return {
      id,
      deal_id: trust.positiveId(item && item.deal_id),
      name: trust.text(item && item.name, 240) || 'Produit suivi',
      price_dropped: item && item.price_dropped === true,
      added_price: finitePositive(item && item.added_price),
      current_best_price: finitePositive(item && item.current_best_price),
      target_price: finitePositive(item && item.target_price),
      best_store: trust.text(item && item.best_store, 160),
    };
  }).filter(Boolean);

  if (!normalized.length) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--txt3)"><div style="font-size:32px;margin-bottom:10px">🎯</div>Aucun produit suivi. Ajoutez-en un !</div>';
    return;
  }

  el.innerHTML = normalized.map(function(item) {
    const targetState = item.target_price
      ? (item.current_best_price !== null
          ? (item.current_best_price <= item.target_price
              ? '✅ ATTEINT !'
              : '(encore ' + Math.max(0, item.current_best_price - item.target_price).toFixed(0) + '€ à baisser)')
          : 'Prix actuel non observé')
      : '';
    return \`
    <div class="wish-item \${item.price_dropped ? 'price-dropped' : ''}">
      \${item.price_dropped ? '<div class="wish-drop-badge">📉 BAISSE !</div>' : ''}
      <div class="wish-name">\${trust.html(item.name)}</div>
      <div class="wish-price-row">
        \${item.added_price !== null ? \`<div class="wish-price-added">\${formatPrice(item.added_price)} ajouté</div>\` : ''}
        <div class="wish-price-current">\${item.current_best_price !== null ? formatPrice(item.current_best_price) : '—'}</div>
        \${item.best_store ? \`<div style="font-size:11px;color:var(--txt3);margin-left:4px">\${trust.html(item.best_store)}</div>\` : ''}
      </div>
      \${item.target_price !== null ? \`<div style="font-size:11px;color:var(--txt3);margin-top:4px">🎯 Objectif : \${formatPrice(item.target_price)} \${targetState}</div>\` : ''}
      <div style="display:flex;gap:8px;margin-top:10px">
        \${item.deal_id ? \`<button type="button" data-wishlist-open-deal="\${item.deal_id}" style="flex:1;background:var(--accent);color:#fff;border:none;border-radius:8px;padding:7px;font-size:12px;font-weight:600;cursor:pointer">Voir le deal</button>\` : ''}
        <button type="button" data-wishlist-remove="\${item.id}" style="background:rgba(255,59,48,.1);border:1px solid rgba(255,59,48,.2);color:#FF3B30;border-radius:8px;padding:7px 10px;font-size:12px;cursor:pointer">✕</button>
      </div>
    </div>\`;
  }).join('');

  el.querySelectorAll('[data-wishlist-open-deal]').forEach(function(button) {
    button.addEventListener('click', function() {
      const dealId = trust.positiveId(button.getAttribute('data-wishlist-open-deal'));
      if (dealId) openDealById(dealId);
    });
  });
  el.querySelectorAll('[data-wishlist-remove]').forEach(function(button) {
    button.addEventListener('click', function() {
      const itemId = trust.positiveId(button.getAttribute('data-wishlist-remove'));
      if (itemId) removeFromWishlist(itemId);
    });
  });
}

`;

function hardenHtml(html) {
  if (html.includes(`// ${MARKER}`)) return html;
  const start = html.indexOf(START);
  const end = html.indexOf(END, start + START.length);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('P6.34 wishlist hardening could not locate canonical block');
  }
  const original = html.slice(start, end);
  for (const sink of [
    '${item.name}',
    '${item.best_store}',
    'openDealById(${item.deal_id})',
    'removeFromWishlist(${item.id})',
  ]) {
    if (!original.includes(sink)) throw new Error(`P6.34 expected wishlist sink missing: ${sink}`);
  }
  const output = html.slice(0, start) + HARDENED + html.slice(end);
  assertHardened(output);
  return output;
}

function assertHardened(html) {
  const start = html.indexOf(`// ${MARKER}`);
  const end = html.indexOf(END, start);
  if (start < 0 || end < 0) throw new Error('P6.34 hardened wishlist block missing');
  const block = html.slice(start, end);
  for (const bad of [
    '${item.name}',
    '${item.best_store}',
    'onclick="openDealById',
    'onclick="removeFromWishlist',
  ]) {
    if (block.includes(bad)) throw new Error(`P6.34 wishlist sink remains: ${bad}`);
  }
  for (const required of [
    'trust.positiveId(item && item.id)',
    'trust.text(item && item.name, 240)',
    'trust.html(item.name)',
    'data-wishlist-open-deal',
    'data-wishlist-remove',
    "button.addEventListener('click'",
  ]) {
    if (!block.includes(required)) throw new Error(`P6.34 missing ${required}`);
  }
}

function hardenPublicArtifact(indexPath) {
  const target = indexPath || path.join(__dirname, '..', 'dist', 'index.html');
  const source = fs.readFileSync(target, 'utf8');
  const hardened = hardenHtml(source);
  fs.writeFileSync(target, hardened, 'utf8');
  console.log('P6_34_WISHLIST_HTML_TRUST_PASS');
}

if (require.main === module) hardenPublicArtifact();

module.exports = { MARKER, assertHardened, hardenHtml, hardenPublicArtifact };
