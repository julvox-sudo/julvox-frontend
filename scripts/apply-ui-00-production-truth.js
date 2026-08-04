const fs = require('fs');
const path = require('path');

const root = process.cwd();
const dist = path.join(root, 'dist');
const indexPath = path.join(dist, 'index.html');
const enhancementsPath = path.join(dist, 'enhancements_v3.js');

function fail(message) {
  throw new Error(`UI-00 production truth transform failed: ${message}`);
}
function readRequired(filePath) {
  if (!fs.existsSync(filePath)) fail(`missing ${path.relative(root, filePath)}`);
  return fs.readFileSync(filePath, 'utf8');
}
function replaceRequired(source, pattern, replacement, label, minimum = 1) {
  const matches = typeof pattern === 'string'
    ? source.split(pattern).length - 1
    : [...source.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`))].length;
  if (matches < minimum) fail(`expected ${label}, found ${matches}`);
  return source.replace(pattern, replacement);
}
function findMatchingBrace(source, openingIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = openingIndex; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '/' && next === '/') { lineComment = true; i += 1; continue; }
    if (char === '/' && next === '*') { blockComment = true; i += 1; continue; }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}
function replaceNamedFunction(source, name, replacement, required = true) {
  const expression = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`);
  const match = expression.exec(source);
  if (!match) {
    if (required) fail(`function ${name} not found`);
    return source;
  }
  const braceStart = source.indexOf('{', match.index + match[0].length);
  if (braceStart < 0) fail(`opening brace for ${name} not found`);
  const braceEnd = findMatchingBrace(source, braceStart);
  if (braceEnd < 0) fail(`closing brace for ${name} not found`);
  return `${source.slice(0, match.index)}${replacement}${source.slice(braceEnd + 1)}`;
}
function replaceObjectDeclaration(source, name, replacement) {
  const expression = new RegExp(`const\\s+${name}\\s*=\\s*\\{`);
  const match = expression.exec(source);
  if (!match) fail(`object declaration ${name} not found`);
  const braceStart = source.indexOf('{', match.index);
  const braceEnd = findMatchingBrace(source, braceStart);
  if (braceEnd < 0) fail(`object declaration ${name} is not closed`);
  let end = braceEnd + 1;
  if (source[end] === ';') end += 1;
  return `${source.slice(0, match.index)}${replacement}${source.slice(end)}`;
}
function centralizeApiFetches(source) {
  return source
    .replace(/\bfetch\(\s*(?=API\s*\+)/g, 'window.JULVOX_API.fetchResponse(')
    .replace(/\bfetch\(\s*(?=`\$\{API\})/g, 'window.JULVOX_API.fetchResponse(');
}

let html = readRequired(indexPath);
let enhancements = readRequired(enhancementsPath);

html = replaceRequired(
  html,
  '<script src="/runtime-config.js"></script>',
  '<script src="/runtime-config.js"></script>\n<script src="/api-client.js"></script>',
  'runtime configuration script',
);
html = replaceRequired(
  html,
  '<script src="/enhancements_v3.js" defer></script>',
  '<script src="/enhancements_v3.js" defer></script>\n<script src="/ui-00-production-truth.js" defer></script>',
  'enhancements script',
);
html = html.replace(
  /const API = window\.JULVOX_RUNTIME_CONFIG\?\.backend\?\.(?:apiBaseUrl|api_base_url) \|\| ['"][^'"]+['"];/,
  "const API = window.JULVOX_RUNTIME_CONFIG?.backend?.apiBaseUrl || '';",
);

const mutationFunctions = [
  'createAlert', 'createSmartAlertForDeal', 'deleteAlert', 'voteDeal',
  'submitCommunityDealNew', 'voteCommDeal', 'postDealComment', 'postCommComment',
  'submitReport', 'createSquad', 'joinSquad', 'addToWishlist', 'removeFromWishlist',
  'subscribeNewsletter', 'enableNotifPermission', 'deleteAccount', 'votePromo',
];
for (const name of mutationFunctions) html = replaceNamedFunction(html, name, '', true);

html = html
  .replace(/renderCompareResults\(getDemoCompareResults\([^)]*\),\s*([^)]+)\);/g, "window.JULVOX_PRODUCTION_TRUTH?.renderState($1, 'error', 'Comparaison indisponible. Réessayez.', () => window.runCompareSearch?.());")
  .replace(/renderLeaderboard\(getDemoLeaderboard\(\),\s*([^)]+)\);/g, "window.JULVOX_PRODUCTION_TRUTH?.renderState($1, 'error', 'Classement indisponible. Réessayez.', () => window.loadCommLeader?.($1));")
  .replace(/renderCommDeals\(getDemoCommDeals\(\),\s*([^,]+),\s*([^)]+)\);/g, "window.JULVOX_PRODUCTION_TRUTH?.renderState($1, 'error', 'Deals communautaires indisponibles. Réessayez.', () => window.loadCommDeals?.($2, $1));")
  .replace(/renderReport\(getDemoReport\(\),\s*([^)]+)\);/g, "window.JULVOX_PRODUCTION_TRUTH?.renderState($1, 'error', 'Rapport indisponible. Réessayez.', () => window.loadMonthlyReport?.($1));")
  .replace(/renderScanResults\(getDemoScanResult\([^)]*\),\s*[^,]+,\s*([^)]+)\);/g, "window.JULVOX_PRODUCTION_TRUTH?.renderState($1, 'error', 'Scanner indisponible.', null);")
  .replace(/renderWishlistItems\(getDemoWishlist\(\),\s*([^)]+)\);/g, "window.JULVOX_PRODUCTION_TRUTH?.renderState($1, 'error', 'Wishlist indisponible. Réessayez.', () => window.loadWishlistItems?.());")
  .replace(/renderAchievements\(getDemoAchievements\(\),\s*([^)]+)\);/g, "window.JULVOX_PRODUCTION_TRUTH?.renderState($1, 'error', 'Progression indisponible. Réessayez.', () => window.loadAchievements?.($1));");

const demoFunctions = [
  'getDemoCompareResults', 'getDemoLeaderboard', 'getDemoCommDeals', 'getDemoReport',
  'getDemoScanResult', 'getDemoWishlist', 'getDemoAchievements',
  'generateSimulatedHistory', 'localAnalyzeDeal',
];
for (const name of demoFunctions) html = replaceNamedFunction(html, name, '', false);

html = replaceNamedFunction(html, 'runDealAnalysis', `async function runDealAnalysis() {
  const currentPrice = Number.parseFloat(document.getElementById('analyzeCurrentPrice')?.value);
  const originalPrice = Number.parseFloat(document.getElementById('analyzeOriginalPrice')?.value) || null;
  const store = document.getElementById('analyzeStore')?.value || '';
  const category = document.getElementById('analyzeCategory')?.value || '';
  const resultsEl = document.getElementById('analyzeResults');
  if (!currentPrice || currentPrice <= 0) { showToast('⚠️ Entre un prix valide'); return; }
  resultsEl.innerHTML = '<div style="text-align:center;padding:30px;color:var(--txt3)">Analyse en cours…</div>';
  const result = await window.JULVOX_API.post('/deals/analyze', {
    current_price: currentPrice,
    claimed_original: originalPrice,
    price_history: [],
    store,
    category,
  }, { confirm: data => Number.isFinite(data?.score) });
  if (!result.ok) {
    window.JULVOX_PRODUCTION_TRUTH?.renderState(resultsEl, 'error', result.message || 'Analyse indisponible.', runDealAnalysis);
    return;
  }
  renderAnalysisResults(result.data, resultsEl, currentPrice, originalPrice);
}`, true);

html = replaceNamedFunction(html, 'renderTrustDetail', `function renderTrustDetail(deal) {
  const merchant = deal?.merchant || deal?.merchant_trust || null;
  if (!merchant || !Number.isFinite(merchant.score)) return '';
  const score = merchant.score;
  const label = merchant.tier ? 'Niveau ' + merchant.tier : 'Donnée backend';
  return '<div style="background:var(--bg3);border-radius:14px;padding:14px;margin-bottom:12px">' +
    '<div style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--txt2)">Confiance marchand</div>' +
    '<div style="display:flex;justify-content:space-between;font-size:12px"><span>' + escapeHtml(label) + '</span><strong>' + score + '/100</strong></div></div>';
}`, true);

html = replaceObjectDeclaration(html, 'STORE_TRUST', "const STORE_TRUST = Object.freeze({}); /* UI-00: aucune vérité marchand locale */");
html = html
  .replace(/const trust\s*=\s*STORE_TRUST\[d\.store\]\s*\|\|\s*82;/g, 'const trust = Number.isFinite(d.merchant_trust_score) ? d.merchant_trust_score : null;')
  .replace(/const tCls\s*=\s*trust >= 95 \? 'trust-high' : trust >= 88 \? 'trust-med' : 'trust-low';/g, "const tCls = trust === null ? '' : trust >= 95 ? 'trust-high' : trust >= 88 ? 'trust-med' : 'trust-low';")
  .replace(/const tLbl\s*=\s*trust >= 95 \? `✓\$\{trust\}%` : trust >= 88 \? `~\$\{trust\}%` : `\?\$\{trust\}%`;/g, "const tLbl = trust === null ? '' : trust >= 95 ? `✓${trust}%` : trust >= 88 ? `~${trust}%` : `?${trust}%`;")
  .replace(/const mins\s*=\s*Math\.floor\(Math\.random\(\) \* 58 \+ 1\);/g, 'const mins = null;')
  .replace(/<span class="deal-trust \$\{tCls\}">\$\{tLbl\}<\/span>/g, "${trust === null ? '' : `<span class=\"deal-trust ${tCls}\">${tLbl}</span>`}")
  .replace(/\$\{ok \? `<div class="deal-verified">✓ Vérifié il y a \$\{mins\} min<\/div>` : ''\}/g, "${ok ? '<div class=\"deal-verified\">✓ Score fourni par le service</div>' : ''}")
  .replace(/(\b(?:deal|d)\.novadeal_score)\s*\|\|\s*50/g, '$1 ?? null')
  .replace(/\(d\.novadeal_score\s*\|\|\s*d\.score\)\s*\|\|\s*50/g, '(d.novadeal_score ?? d.score ?? null)')
  .replace(/Compte supprimé localement/g, 'Suppression impossible. Réessayez.')
  .replace(/Deal soumis \(vérification en cours\) ! \+15 pts/g, 'Soumission impossible. Réessayez.')
  .replace(/Alerte enregistrée pour/g, 'Création de l’alerte impossible pour')
  .replace(/\bLIVE\b/g, 'OFFRES')
  .replace(/en temps réel/gi, 'à partir des données disponibles')
  .replace(/temps réel/gi, 'données disponibles');
html = centralizeApiFetches(html);

enhancements = replaceObjectDeclaration(enhancements, 'STORE_TRUST_V3', "const STORE_TRUST_V3 = Object.freeze({}); /* UI-00: aucune vérité marchand locale */");
enhancements = replaceNamedFunction(enhancements, 'loadDynamicFlashDeals', `async function loadDynamicFlashDeals() {
  const result = await window.JULVOX_API.get('/deals/trending?limit=8', {
    isEmpty: data => !Array.isArray(data?.deals) || data.deals.length === 0,
  });
  const flashRow = document.getElementById('flashRow');
  if (!result.ok) {
    window.JULVOX_PRODUCTION_TRUTH?.renderState(flashRow, 'error', result.message || 'Ventes flash indisponibles.', loadDynamicFlashDeals);
    return;
  }
  if (result.kind === 'empty') {
    window.JULVOX_PRODUCTION_TRUTH?.renderState(flashRow, 'empty', 'Aucune vente flash disponible.', loadDynamicFlashDeals);
    return;
  }
  window._liveFlash = result.data.deals;
  if (typeof renderFlashLive === 'function') renderFlashLive(result.data.deals);
}`, true);
enhancements = enhancements
  .replace(/\bLIVE\b/g, 'OFFRES')
  .replace(/en temps réel/gi, 'à partir des données disponibles')
  .replace(/temps réel/gi, 'données disponibles')
  .replace(/60\+ deals démo[^\n]*/gi, 'données de production uniquement');
enhancements = centralizeApiFetches(enhancements);

fs.writeFileSync(indexPath, html, 'utf8');
fs.writeFileSync(enhancementsPath, enhancements, 'utf8');
console.log('UI-00 production truth applied to dist/.');
