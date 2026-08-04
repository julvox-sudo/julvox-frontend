module.exports = function transformStage(html, enhancements, helpers) {
  const { replaceNamedFunction } = helpers;

  html = replaceNamedFunction(html, 'runCompareV2', `async function runCompareV2() {
  const q = document.getElementById('compareV2Input')?.value?.trim();
  const resEl = document.getElementById('compareV2Results');
  if (!resEl) return;
  if (!q || q.length < 2) { showToast('⚠️ Entre un nom de produit'); return; }
  resEl.textContent = 'Recherche en cours…';
  const result = await window.JULVOX_API.get('/search/compare?q=' + encodeURIComponent(q), {
    isEmpty: data => !Array.isArray(data?.results) || data.results.length === 0,
  });
  if (!result.ok) {
    window.JULVOX_PRODUCTION_TRUTH.renderState(resEl, 'error', result.message || 'Comparaison indisponible.', runCompareV2);
    return;
  }
  if (result.kind === 'empty') {
    window.JULVOX_PRODUCTION_TRUTH.renderState(resEl, 'empty', 'Aucun résultat confirmé pour cette recherche.', runCompareV2);
    return;
  }
  renderCompareResults(result.data.results, resEl);
}`, true);

  html = replaceNamedFunction(html, 'loadProductComparison', `async function loadProductComparison(productId, productName) {
  const resEl = document.getElementById('compareV2Results');
  if (!resEl) return;
  resEl.textContent = 'Comparaison en cours…';
  const result = await window.JULVOX_API.get('/products/' + encodeURIComponent(productId) + '/compare', {
    confirm: data => data && typeof data === 'object' && data.product && typeof data.product === 'object',
  });
  if (!result.ok) {
    window.JULVOX_PRODUCTION_TRUTH.renderState(resEl, 'error', result.message || 'Comparaison indisponible.', () => loadProductComparison(productId, productName));
    return;
  }
  renderProductComparison(result.data, resEl);
}`, true);

  return { html, enhancements };
};
