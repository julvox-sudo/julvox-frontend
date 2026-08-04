module.exports = function transformStage(html, enhancements, helpers) {
  const { HTML_MARKER, ENHANCEMENTS_MARKER, replaceExactly, replaceAtLeast, replaceNamedFunction, replaceObjectDeclaration, removeBetween, renderLoadFailureCode } = helpers;
    html = replaceExactly(
    html,
    '<script src="/runtime-config.js"></script>',
    `${HTML_MARKER}\n<script src="/runtime-config.js"></script>\n<script src="/api-client.js"></script>`,
    'runtime configuration script',
  );
  html = replaceExactly(
    html,
    '<script src="/enhancements_v3.js" defer></script>',
    '<script src="/ui-00-production-truth.js" defer></script>\n<script src="/enhancements_v3.js" defer></script>',
    'enhancements script',
  );
  html = replaceExactly(
    html,
    /const API = window\.JULVOX_RUNTIME_CONFIG\?\.backend\?\.(?:apiBaseUrl|api_base_url) \|\| ['"][^'"]*['"];/,
    "const API = window.JULVOX_RUNTIME_CONFIG?.backend?.apiBaseUrl || '';",
    'runtime API declaration',
  );

  const removedFunctions = [
    'createAlert', 'createSmartAlertForDeal', 'deleteAlert', 'voteDeal',
    'submitCommunityDealNew', 'voteCommDeal', 'postDealComment', 'postCommComment',
    'submitReport', 'createSquad', 'joinSquad', 'addToWishlist', 'removeFromWishlist',
    'subscribeNewsletter', 'enableNotifPermission', 'deleteAccount', 'votePromo',
    'getDemoCompareResults', 'getDemoLeaderboard', 'getDemoCommDeals', 'getDemoReport',
    'getDemoScanResult', 'getDemoWishlist', 'getDemoAchievements',
    'generateSimulatedHistory', 'localAnalyzeDeal', 'injectLocalAnalysis', 'getLocalCalendar', 'getDefaultProPlans',
    'getLocalAIResponse', 'getDefaultCbRates', 'fetchWithTimeout', 'fetchWithRetry',
    'buildDealsPrompt', 'buildPromosPrompt', 'buildFlashPrompt', 'callClaudeAI',
  ];
  for (const name of removedFunctions) html = replaceNamedFunction(html, name, '', true);
  html = replaceObjectDeclaration(html, 'FRENCH_SITES', 'const FRENCH_SITES = Object.freeze({}); /* UI-00: aucun catalogue local */');
  html = replaceExactly(html, 'placeholder="Ex: MacBook Air M3, Sony WH-1000XM5…"', 'placeholder="Rechercher un produit à comparer…"', 'demo product placeholder');

  html = removeBetween(
    html,
    'var _origOpenPromosPage = null;',
    '}, 500);',
    'legacy promotion override',
  );

  html = replaceNamedFunction(html, 'loadWishlistItems', `async function loadWishlistItems() {
  const token = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.token : localStorage.getItem('token');
  const el = document.getElementById('wishlistItems');
  if (!el) return;
  if (!token) { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'empty', 'Connecte-toi pour utiliser la wishlist.', null); return; }
  const result = await window.JULVOX_API.get('/wishlist', { token, isEmpty: data => !Array.isArray(data?.items) || data.items.length === 0 });
  if (!result.ok) { ${renderLoadFailureCode('el', 'Wishlist indisponible. Les dernières données confirmées sont conservées.', 'loadWishlistItems')} return; }
  if (result.kind === 'empty') { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'empty', 'Ta wishlist est vide.', loadWishlistItems); return; }
  renderWishlistItems(result.data.items, el);
  el.dataset.ui00Confirmed = 'true';
}`, true);

  html = replaceNamedFunction(html, 'loadWishlist', `async function loadWishlist() {
  const token = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.token : localStorage.getItem('token');
  const el = document.getElementById('wishlistContent');
  if (!el) return;
  if (!token) { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'empty', 'Connecte-toi pour voir ta wishlist.', null); return; }
  const result = await window.JULVOX_API.get('/wishlist', { token, isEmpty: data => !Array.isArray(data?.wishlist) || data.wishlist.length === 0 });
  if (!result.ok) { ${renderLoadFailureCode('el', 'Wishlist indisponible. Les dernières données confirmées sont conservées.', 'loadWishlist')} return; }
  if (result.kind === 'empty') { window.JULVOX_PRODUCTION_TRUTH.renderState(el, 'empty', 'Ta wishlist est vide.', loadWishlist); return; }
  renderWishlist(result.data.wishlist, el);
  el.dataset.ui00Confirmed = 'true';
}`, true);

  html = replaceNamedFunction(html, '_loadAndRenderPriceChart', `async function _loadAndRenderPriceChart(deal) {
  const dealId = deal?.id;
  const slot = document.getElementById('priceChartSlot_' + dealId);
  if (!slot) return;
  const retry = () => _loadAndRenderPriceChart(deal);
  if (!Number.isInteger(dealId)) { window.JULVOX_PRODUCTION_TRUTH.renderState(slot, 'empty', 'Historique indisponible.', null); return; }
  const result = await window.JULVOX_API.get('/deals/' + encodeURIComponent(dealId), {
    isEmpty: data => !Array.isArray(data?.price_history) || data.price_history.length < 2,
  });
  if (!result.ok) {
    if (slot.dataset.ui00Confirmed === 'true') window.JULVOX_PRODUCTION_TRUTH.renderPreservedError(slot, 'Historique indisponible. Les dernières données confirmées sont conservées.', retry);
    else window.JULVOX_PRODUCTION_TRUTH.renderState(slot, 'error', 'Historique indisponible.', retry);
    return;
  }
  const history = result.data.price_history.filter(point => Number.isFinite(Number(point?.price)) && point?.date);
  if (history.length < 2) { window.JULVOX_PRODUCTION_TRUTH.renderState(slot, 'empty', 'Historique indisponible.', retry); return; }
  renderPriceHistoryChart(history, slot);
  slot.dataset.ui00Confirmed = 'true';
}`, true);

  html = replaceNamedFunction(html, 'runDealAnalysis', `async function runDealAnalysis() {
  const currentPrice = Number.parseFloat(document.getElementById('analyzeCurrentPrice')?.value);
  const originalPrice = Number.parseFloat(document.getElementById('analyzeOriginalPrice')?.value) || null;
  const store = document.getElementById('analyzeStore')?.value || '';
  const category = document.getElementById('analyzeCategory')?.value || '';
  const resultsEl = document.getElementById('analyzeResults');
  if (!currentPrice || currentPrice <= 0) { showToast('⚠️ Entre un prix valide'); return; }
  resultsEl.textContent = 'Analyse en cours…';
  const result = await window.JULVOX_API.post('/deals/analyze', {
    current_price: currentPrice, claimed_original: originalPrice, price_history: [], store, category,
  }, { confirm: data => Number.isFinite(data?.score) });
  if (!result.ok) { window.JULVOX_PRODUCTION_TRUTH.renderState(resultsEl, 'error', result.message || 'Analyse indisponible.', runDealAnalysis); return; }
  renderAnalysisResults(result.data, resultsEl, currentPrice, originalPrice);
}`, true);

  html = replaceNamedFunction(html, 'renderTrustDetail', `function renderTrustDetail(deal) {
  const merchant = deal?.merchant || deal?.merchant_trust || null;
  if (!merchant || !Number.isFinite(merchant.score)) return '<div style="color:var(--txt3)">Score marchand indisponible</div>';
  const label = merchant.tier ? 'Niveau ' + merchant.tier : 'Donnée backend';
  return '<div style="background:var(--bg3);border-radius:14px;padding:14px;margin-bottom:12px"><div style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--txt2)">Confiance marchand</div><div style="display:flex;justify-content:space-between;font-size:12px"><span>' + escapeHtml(label) + '</span><strong>' + merchant.score + '/100</strong></div></div>';
}`, true);
  return { html, enhancements };
};
