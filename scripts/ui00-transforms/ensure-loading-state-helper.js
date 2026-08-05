const LOAD_DEALS_ANCHOR = 'async function loadDeals(cat, minSc) {';
const LOADING_HELPER = `function showLoadingDeals() {
  const grid = document.getElementById('dealsGrid');
  if (!grid) return;
  const state = document.createElement('div');
  state.dataset.ui00State = 'loading';
  state.setAttribute('role', 'status');
  state.setAttribute('aria-live', 'polite');
  state.style.cssText = 'grid-column:1/-1;text-align:center;padding:24px;color:var(--txt2)';
  state.textContent = 'Vérification des offres réelles...';
  grid.replaceChildren(state);
}`;

function ensureLoadingStateHelper(source) {
  const input = String(source);
  const helperCount = (input.match(/function\s+showLoadingDeals\s*\(/g) || []).length;
  if (helperCount === 1) return input;
  if (helperCount !== 0) throw new Error(`UI-00 loading helper injection failed: expected at most one helper, found ${helperCount}`);
  const anchorCount = input.split(LOAD_DEALS_ANCHOR).length - 1;
  if (anchorCount !== 1) throw new Error(`UI-00 loading helper injection failed: expected exactly one loadDeals anchor, found ${anchorCount}`);
  return input.replace(LOAD_DEALS_ANCHOR, `${LOADING_HELPER}\n\n${LOAD_DEALS_ANCHOR}`);
}

module.exports = { LOAD_DEALS_ANCHOR, LOADING_HELPER, ensureLoadingStateHelper };
