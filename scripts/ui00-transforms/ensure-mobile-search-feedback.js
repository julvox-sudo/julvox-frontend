const SEARCH_RUNTIME_START = '// ── SEARCH ────────────────────────────────────────────────────';
const SEARCH_RUNTIME_END = '// ── FAVORITES ─────────────────────────────────────────────────';
const SEARCH_FEEDBACK_MARKER = '// ui-00-mobile-search-feedback:v1';
const SEARCH_INPUT = '<input type="text" placeholder="Chercher un deal, une marque…" id="searchInput" oninput="handleSearch(this.value)"/>';
const SEARCH_INPUT_ENHANCED = '<input type="text" placeholder="Chercher un deal, une marque…" id="searchInput" oninput="handleSearch(this.value)" aria-controls="dealsGrid" aria-describedby="searchStatus" enterkeyhint="search" autocomplete="off"/>';
const SEARCH_CONTAINER = `  <div class="search-inner">
    <span class="search-icon">🔍</span>
    ${SEARCH_INPUT}
  </div>`;
const SEARCH_CONTAINER_ENHANCED = `  <div class="search-inner">
    <span class="search-icon">🔍</span>
    ${SEARCH_INPUT_ENHANCED}
  </div>
  <div id="searchStatus" data-ui00-search-status="true" role="status" aria-live="polite" aria-atomic="true" style="min-height:18px;margin-top:6px;font-size:12px;color:var(--txt3)"></div>`;

const SEARCH_RUNTIME = `${SEARCH_RUNTIME_START}
${SEARCH_FEEDBACK_MARKER}
// Recherche locale sur les offres réelles déjà confirmées, avec retour visible près du champ.
const _handleSearchDebounced = (() => {
  let timer;
  return (q) => {
    clearTimeout(timer);
    timer = setTimeout(() => _doSearch(q), 250);
  };
})();

function _setSearchStatus(message) {
  const status = document.getElementById('searchStatus');
  if (status) status.textContent = String(message || '');
}

function _normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function handleSearch(q) {
  const query = String(q ?? '');
  const trimmed = query.trim();
  _setSearchStatus(trimmed ? \`Recherche de « \${trimmed} »…\` : '');
  _handleSearchDebounced(query);
}

function _doSearch(q) {
  const query = String(q ?? '').trim();
  const source = Array.isArray(allDeals) ? allDeals : [];
  const count = document.getElementById('dealCount');
  const grid = document.getElementById('dealsGrid');

  if (!query) {
    renderDeals(source);
    if (count) count.textContent = \`\${source.length} offres\`;
    _setSearchStatus('');
    return;
  }

  if (!source.length) {
    const message = \`Aucune offre chargée à rechercher pour « \${query} ».\`;
    window.JULVOX_PRODUCTION_TRUTH.renderState(grid, 'empty', message, () => loadDeals(currentCat, minScore));
    if (count) count.textContent = '0 résultat';
    _setSearchStatus(message);
    return;
  }

  const normalizedQuery = _normalizeSearchText(query);
  const matches = source.filter(deal => [deal?.name, deal?.store, deal?.brand, deal?.category]
    .some(value => _normalizeSearchText(value).includes(normalizedQuery)));

  if (!matches.length) {
    const message = \`Aucun résultat vérifié pour « \${query} ».\`;
    window.JULVOX_PRODUCTION_TRUTH.renderState(grid, 'empty', message);
    if (count) count.textContent = '0 résultat';
    _setSearchStatus(message);
    return;
  }

  renderDeals(matches);
  const label = \`\${matches.length} résultat\${matches.length !== 1 ? 's' : ''}\`;
  if (count) count.textContent = label;
  _setSearchStatus(\`\${label} pour « \${query} ».\`);
}

`;

function count(source, token) {
  return String(source).split(token).length - 1;
}

function ensureMobileSearchFeedback(source) {
  const input = String(source);

  if (input.includes(SEARCH_FEEDBACK_MARKER)) {
    if (count(input, SEARCH_FEEDBACK_MARKER) !== 1) throw new Error('UI-00 mobile search transform failed: feedback marker is ambiguous');
    if (count(input, 'id="searchStatus"') !== 1) throw new Error('UI-00 mobile search transform failed: search status is missing or duplicated');
    if (count(input, 'aria-describedby="searchStatus"') !== 1) throw new Error('UI-00 mobile search transform failed: search input status association is missing or duplicated');
    return input;
  }

  const containerCount = count(input, SEARCH_CONTAINER);
  const inputCount = count(input, SEARCH_INPUT);
  const startCount = count(input, SEARCH_RUNTIME_START);
  const endCount = count(input, SEARCH_RUNTIME_END);
  const statusCount = count(input, 'id="searchStatus"');

  if (containerCount === 0 && inputCount === 0 && startCount === 0 && endCount === 0 && statusCount === 0) return input;
  if (containerCount !== 1) throw new Error(`UI-00 mobile search transform failed: expected one search container, found ${containerCount}`);
  if (inputCount !== 1) throw new Error(`UI-00 mobile search transform failed: expected one search input, found ${inputCount}`);
  if (startCount !== 1) throw new Error(`UI-00 mobile search transform failed: expected one search runtime start, found ${startCount}`);
  if (endCount !== 1) throw new Error(`UI-00 mobile search transform failed: expected one search runtime end, found ${endCount}`);
  if (statusCount !== 0) throw new Error('UI-00 mobile search transform failed: an unrecognized search status already exists');

  const start = input.indexOf(SEARCH_RUNTIME_START);
  const end = input.indexOf(SEARCH_RUNTIME_END, start);
  if (end <= start) throw new Error('UI-00 mobile search transform failed: search runtime boundaries are invalid');

  const withRuntime = `${input.slice(0, start)}${SEARCH_RUNTIME}${input.slice(end)}`;
  return withRuntime.replace(SEARCH_CONTAINER, SEARCH_CONTAINER_ENHANCED);
}

module.exports = {
  SEARCH_FEEDBACK_MARKER,
  SEARCH_RUNTIME_START,
  SEARCH_RUNTIME_END,
  SEARCH_INPUT,
  SEARCH_INPUT_ENHANCED,
  ensureMobileSearchFeedback,
};
