function replaceAtMostOnce(source, pattern, replacement, label) {
  const matches = String(source).match(pattern) || [];
  if (matches.length > 1) throw new Error(`UI-00 ${label}: expected at most one occurrence, found ${matches.length}`);
  return String(source).replace(pattern, replacement);
}

function removeFabricatedVerificationTiming(source) {
  let output = replaceAtMostOnce(
    source,
    /^  const mins   = Math\.floor\(Math\.random\(\) \* 58 \+ 1\);\n/m,
    '',
    'random verification duration',
  );
  output = replaceAtMostOnce(
    output,
    /^      \$\{ok \? `<div class="deal-verified">✓ Vérifié il y a \$\{mins\} min<\/div>` : ''\}\n/m,
    '',
    'fabricated verification timestamp rendering',
  );
  return output;
}

function removeNotificationScoreFallback(source) {
  return replaceAtMostOnce(
    source,
    /★\$\{deal\.novadeal_score\|\|0\}/g,
    "${ui00NumericScore(deal.novadeal_score) === null ? 'Score indisponible' : '★' + ui00NumericScore(deal.novadeal_score)}",
    'new deal notification score fallback',
  );
}

module.exports = function transformStage(html, enhancements, helpers) {
  const { HTML_MARKER, ENHANCEMENTS_MARKER, replaceExactly, replaceAtLeast, replaceNamedFunction, replaceObjectDeclaration, removeBetween, renderLoadFailureCode } = helpers;
    html = replaceNamedFunction(html, 'renderDeals', `function renderDeals(deals) {
  const grid = document.getElementById('dealsGrid');
  if (!grid) return;
  if (!Array.isArray(deals) || deals.length === 0) { window.JULVOX_PRODUCTION_TRUTH.renderState(grid, 'empty', 'Aucune offre disponible.', () => loadDeals(currentCat, minScore)); return; }
  const sorted = deals.slice().sort((a, b) => {
    if (currentSort === 'discount') return (b.discount_pct || 0) - (a.discount_pct || 0);
    if (currentSort === 'price_asc') return (a.current_price || 0) - (b.current_price || 0);
    if (currentSort === 'price_desc') return (b.current_price || 0) - (a.current_price || 0);
    return (Number.isFinite(b.novadeal_score) ? b.novadeal_score : -1) - (Number.isFinite(a.novadeal_score) ? a.novadeal_score : -1);
  });
  grid.innerHTML = sorted.map(deal => dealCard(deal)).join('');
  const countEl = document.getElementById('dealCount');
  if (countEl) countEl.textContent = deals.length + ' offres reçues';
  const statDeals = document.getElementById('statDeals');
  if (statDeals) statDeals.textContent = String(deals.length);
  const statSources = document.getElementById('statSources');
  if (statSources) statSources.textContent = String(new Set(deals.map(deal => deal.store).filter(Boolean)).size);
  const discounts = deals.map(deal => Number(deal.discount_pct)).filter(Number.isFinite);
  const statDiscount = document.getElementById('statDiscount');
  if (statDiscount) statDiscount.textContent = discounts.length ? Math.round(discounts.reduce((sum, value) => sum + value, 0) / discounts.length) + '%' : '—';
}`, true);

  html = replaceNamedFunction(html, 'startCountdownsLive', `function startCountdownsLive(flashDeals) {
  flashDeals.forEach(function(deal, index) {
    const seconds = Number(deal.seconds_remaining ?? (Number.isFinite(Number(deal.expires_in_hours)) ? Number(deal.expires_in_hours) * 3600 : NaN));
    const element = document.getElementById('timer_live_' + index);
    if (!element) return;
    if (!Number.isFinite(seconds) || seconds <= 0) { element.textContent = 'Expiration indisponible'; return; }
    let remaining = Math.round(seconds);
    const timerId = setInterval(function() {
      if (remaining <= 0) { clearInterval(timerId); element.textContent = 'Expiré'; return; }
      const hours = String(Math.floor(remaining / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0');
      const secs = String(remaining % 60).padStart(2, '0');
      element.textContent = hours + ':' + minutes + ':' + secs;
      remaining -= 1;
    }, 1000);
  });
}`, true);

  html = replaceNamedFunction(html, 'renderFlash', `function renderFlash() {
  const data = Array.isArray(window._liveFlash) ? window._liveFlash : [];
  renderFlashLive(data);
}`, true);

  html = replaceNamedFunction(html, 'openFlashPage', `function openFlashPage() {
  const flashData = Array.isArray(window._liveFlash) ? sanitizeRealDeals(window._liveFlash) : [];
  const grid = document.getElementById('flashGrid');
  if (!grid) return;
  if (!flashData.length) { window.JULVOX_PRODUCTION_TRUTH.renderState(grid, 'empty', 'Aucune vente flash disponible.', openFlashPage); openPage('flashPage'); return; }
  grid.innerHTML = flashData.map(function(deal, index) {
    const image = getProductImage(Object.assign({}, deal, { category: deal.cat || deal.category }));
    const url = buildAffiliateUrl(deal.affiliate_url || deal.url || '#');
    const price = Number.isFinite(Number(deal.current_price)) ? Number(deal.current_price).toFixed(2) + '€' : '';
    const discount = Number.isFinite(Number(deal.discount_pct)) ? Number(deal.discount_pct) : 0;
    return '<div class="flash-card-full" data-url="' + escHtml(url) + '"><img style="width:100%;height:110px;object-fit:contain;background:var(--bg3);border-radius:10px;margin-bottom:8px;padding:6px" src="' + escHtml(image) + '" alt="' + escHtml(deal.name || '') + '" loading="lazy"/><div class="flash-badge">' + (discount > 0 ? '-' + Math.round(discount) + '%' : 'Flash') + '</div><div style="font-size:12px;font-weight:600;text-align:center;margin-bottom:4px">' + escHtml(deal.name || '') + '</div><div style="font-family:Syne,sans-serif;font-size:15px;font-weight:700;color:var(--accent);text-align:center">' + price + '</div><div class="flash-timer" id="ftimer_' + index + '" style="text-align:center">Expiration indisponible</div></div>';
  }).join('');
  grid.querySelectorAll('.flash-card-full[data-url]').forEach(card => card.addEventListener('click', function() {
    const url = this.getAttribute('data-url');
    if (url && /^https?:\/\//i.test(url)) window.open(url, '_blank', 'noopener,noreferrer');
  }));
  flashData.forEach((deal, index) => {
    const seconds = Number(deal.seconds_remaining ?? (Number.isFinite(Number(deal.expires_in_hours)) ? Number(deal.expires_in_hours) * 3600 : NaN));
    const element = document.getElementById('ftimer_' + index);
    if (!element || !Number.isFinite(seconds) || seconds <= 0) return;
    let remaining = Math.round(seconds);
    const update = () => {
      if (remaining <= 0) { element.textContent = 'Expiré'; return; }
      element.textContent = String(Math.floor(remaining / 3600)).padStart(2, '0') + ':' + String(Math.floor((remaining % 3600) / 60)).padStart(2, '0') + ':' + String(remaining % 60).padStart(2, '0');
      remaining -= 1;
      setTimeout(update, 1000);
    };
    update();
  });
  openPage('flashPage');
}`, true);

  html = replaceNamedFunction(html, 'fetchFlashDeals', `async function fetchFlashDeals() {
  const cache = typeof DS_CACHE !== 'undefined' ? DS_CACHE : null;
  if (cache?.flash && Date.now() - cache.flash.ts < 1_200_000) return cache.flash.data;
  const result = await window.JULVOX_API.get('/deals?is_flash=true&limit=8', {
    isEmpty: data => !Array.isArray(data?.deals) || data.deals.length === 0,
  });
  if (!result.ok || result.kind === 'empty') return [];
  const flash = result.data.deals.map(deal => Object.assign({}, deal, {
    price: Number.isFinite(Number(deal.current_price)) ? Number(deal.current_price).toFixed(2) + '€' : '',
    cat: deal.category || 'high-tech',
    url: deal.affiliate_url || '',
    seconds_remaining: Number.isFinite(Number(deal.seconds_remaining)) ? Number(deal.seconds_remaining) : null,
  }));
  if (cache) cache.flash = { data: flash, ts: Date.now() };
  return flash;
}`, true);
  html = replaceNamedFunction(html, 'fetchFlashDealsFromClaude', 'async function fetchFlashDealsFromClaude() { return fetchFlashDeals(); }', true);

  html = replaceNamedFunction(html, 'renderMLRecommendations', `function renderMLRecommendations(data, el) {
  const deals = Array.isArray(data?.recommendations) ? data.recommendations : [];
  const profile = data?.profile && typeof data.profile === 'object' ? data.profile : {};
  const categories = Array.isArray(profile.favorite_categories) && profile.favorite_categories.length ? profile.favorite_categories.join(', ') : 'indisponibles';
  const preference = Number.isFinite(profile.score_preference) ? profile.score_preference + '+' : 'indisponible';
  el.innerHTML = (profile.personalized ? '<div style="background:rgba(255,184,0,.08);border:1px solid rgba(255,184,0,.2);border-radius:14px;padding:12px;margin-bottom:16px"><strong>Feed personnalisé expérimental</strong><div style="font-size:11px;color:var(--txt3)">Catégories : ' + escapeHtml(categories) + ' · Score préféré : ' + preference + '</div></div>' : '') + deals.map(function(deal) {
    const score = Number.isFinite(deal.novadeal_score) ? deal.novadeal_score : null;
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px;margin-bottom:10px"><div style="font-size:13px;font-weight:600">' + escapeHtml(deal.name || '') + '</div><div style="font-size:11px;color:var(--txt3)">' + escapeHtml(deal.store || '') + '</div><div>' + (score === null ? 'Score indisponible' : 'Score ' + score) + '</div></div>';
  }).join('');
}`, true);

  html = removeFabricatedVerificationTiming(html);

  html = replaceObjectDeclaration(html, 'STORE_TRUST', 'const STORE_TRUST = Object.freeze({}); /* UI-00: aucune vérité marchand locale */');
  html = replaceAtLeast(html, /<div class="live-pill"><div class="live-dot"><\/div>Live<\/div>/g, '<div class="live-pill">Offres</div>', 'visible Live labels', 2);
  html = replaceAtLeast(html, /deals vérifiés ✓/g, 'offres reçues', 'unqualified verified deal labels', 1);
  html = replaceAtLeast(html, /\bLIVE\b/g, 'OFFRES', 'uppercase LIVE labels', 1);
  html = html.replace(/en temps réel/gi, 'à partir des données disponibles').replace(/temps réel/gi, 'données disponibles');

  enhancements = replaceObjectDeclaration(enhancements, 'STORE_TRUST_V3', 'const STORE_TRUST_V3 = Object.freeze({}); /* UI-00: aucune vérité marchand locale */');
  enhancements = removeNotificationScoreFallback(enhancements);
  enhancements = replaceNamedFunction(enhancements, 'loadDynamicFlashDeals', `async function loadDynamicFlashDeals() {
  const result = await window.JULVOX_API.get('/deals/trending?limit=8', { isEmpty: data => !Array.isArray(data?.deals) || data.deals.length === 0 });
  const flashRow = document.getElementById('flashRow');
  if (!result.ok) { window.JULVOX_PRODUCTION_TRUTH.renderState(flashRow, 'error', result.message || 'Ventes flash indisponibles.', loadDynamicFlashDeals); return; }
  if (result.kind === 'empty') { window.JULVOX_PRODUCTION_TRUTH.renderState(flashRow, 'empty', 'Aucune vente flash disponible.', loadDynamicFlashDeals); return; }
  window._liveFlash = result.data.deals;
  if (typeof renderFlashLive === 'function') renderFlashLive(result.data.deals);
}`, true);
  enhancements = `${ENHANCEMENTS_MARKER}\n${enhancements}`
    .replace(/\bLIVE\b/g, 'OFFRES')
    .replace(/en temps réel/gi, 'à partir des données disponibles')
    .replace(/temps réel/gi, 'données disponibles')
    .replace(/60\+ deals démo[^\n]*/gi, 'données de production uniquement');
  return { html, enhancements };
};

module.exports.removeFabricatedVerificationTiming = removeFabricatedVerificationTiming;
module.exports.removeNotificationScoreFallback = removeNotificationScoreFallback;
module.exports.replaceAtMostOnce = replaceAtMostOnce;
